import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createChatStream, mockChatResponses, sentMessages } from "@/test/chat-stream";
import { Chat } from "./chat";

const QUESTION = "How do microplastics affect freshwater fish?";

function setup() {
  const user = userEvent.setup();
  render(<Chat />);
  const input = screen.getByRole("textbox", { name: "Message the research assistant" });
  const sendButton = screen.getByRole("button", { name: "Send" });
  const conversation = screen.getByRole("region", { name: "Conversation" });
  return { user, input, sendButton, conversation };
}

/** Phase announcements for the chat (not tool sub-status regions). */
function chatStatus() {
  const chat = screen.getByRole("region", { name: "Research assistant chat" });
  return within(chat).getAllByRole("status")[0];
}

describe("Chat", () => {
  it("shows the pending state after a send and ignores duplicate sends", async () => {
    const stream = createChatStream();
    const fetchMock = mockChatResponses(stream);
    const { user, input, sendButton, conversation } = setup();

    await user.type(input, QUESTION);
    // A double click: both clicks land before React re-renders with the busy state.
    act(() => {
      sendButton.click();
      sendButton.click();
    });
    // Another click and an Enter press while the request is in flight.
    await user.click(sendButton);
    await user.type(input, "Another question{Enter}");

    expect(within(conversation).getByText(QUESTION)).toBeInTheDocument();
    expect(within(conversation).getByText("Assistant is thinking")).toBeInTheDocument();
    expect(chatStatus()).toHaveTextContent("Assistant is thinking.");
    expect(screen.getByRole("button", { name: "Replying" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentMessages(fetchMock, 0)).toEqual([
      expect.objectContaining({ role: "user", parts: [{ type: "text", text: QUESTION }] }),
    ]);
  });

  it("asks for text instead of sending an empty message", async () => {
    const fetchMock = mockChatResponses();
    const { user, input, sendButton } = setup();

    await user.click(sendButton);

    expect(screen.getByText("Type a message before sending.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the assistant reply as it streams, then the final message", async () => {
    const stream = createChatStream();
    mockChatResponses(stream);
    const { user, input, conversation } = setup();

    await user.type(input, `${QUESTION}{Enter}`);
    stream.begin();
    stream.delta("Microplastics can ");

    const reply = await within(conversation).findByText("Microplastics can");
    expect(chatStatus()).toHaveTextContent("Assistant is responding.");
    expect(within(conversation).queryByText("Assistant is thinking")).not.toBeInTheDocument();

    stream.delta("damage fish gills ");
    await waitFor(() => expect(reply).toHaveTextContent("Microplastics can damage fish gills"));
    expect(screen.getByRole("button", { name: "Replying" })).toBeInTheDocument();

    stream.delta("and reduce growth.");
    stream.finish();

    await waitFor(() =>
      expect(chatStatus()).toHaveTextContent("Assistant finished responding."),
    );
    expect(reply).toHaveTextContent("Microplastics can damage fish gills and reduce growth.");
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sent" })).toBeInTheDocument();
  });

  it("shows the error card for a failed request and retries it exactly once", async () => {
    const retryStream = createChatStream();
    const fetchMock = mockChatResponses(
      new Response("The AI service is temporarily unavailable. Please try again.", { status: 503 }),
      retryStream,
    );
    const { user, input, conversation } = setup();

    await user.type(input, `${QUESTION}{Enter}`);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("The assistant couldn't respond")).toBeInTheDocument();
    expect(
      within(alert).getByText("The AI service is temporarily unavailable. Please try again."),
    ).toBeInTheDocument();
    expect(chatStatus()).toHaveTextContent("The assistant couldn't respond");
    expect(screen.getByRole("button", { name: "Failed" })).toBeInTheDocument();
    // The question stays in the conversation so Retry can resend it.
    expect(within(conversation).getByText(QUESTION)).toBeInTheDocument();

    const retry = within(alert).getByRole("button", { name: "Retry" });
    // A double click: both clicks land before React re-renders without the Retry button.
    act(() => {
      retry.click();
      retry.click();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    retryStream.begin();
    retryStream.delta("Here is the answer after retrying.");
    retryStream.finish();

    expect(await within(conversation).findByText("Here is the answer after retrying.")).toBeInTheDocument();
    await waitFor(() =>
      expect(chatStatus()).toHaveTextContent("Assistant finished responding."),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Retry resends the same turn; it does not add a second copy of the question.
    expect(sentMessages(fetchMock, 1).filter((message) => message.role === "user")).toHaveLength(1);
    expect(within(conversation).getAllByText(QUESTION)).toHaveLength(1);
  });

  it("keeps the partial reply when the stream fails midway", async () => {
    const stream = createChatStream();
    mockChatResponses(stream);
    const { user, input, conversation } = setup();

    await user.type(input, `${QUESTION}{Enter}`);
    stream.begin();
    stream.delta("Partial answer before the failure.");
    await within(conversation).findByText("Partial answer before the failure.");
    stream.fail("The AI service had a temporary problem. Please try again.");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Response interrupted")).toBeInTheDocument();
    expect(within(alert).getByText(/The partial answer is kept above\./)).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(within(conversation).getByText("Partial answer before the failure.")).toBeInTheDocument();
  });

  it("renders a streamed research analysis tool result as a card", async () => {
    const stream = createChatStream();
    mockChatResponses(stream);
    const { user, input, conversation } = setup();

    await user.type(input, "Evaluate my topic: microplastics in freshwater fish{Enter}");
    stream.send({ type: "start" });
    stream.send({ type: "start-step" });
    stream.send({
      type: "tool-input-available",
      toolCallId: "call-1",
      toolName: "analyzeResearchTopic",
      input: { topic: "Microplastics in freshwater fish" },
    });

    expect(await within(conversation).findByText("Analyzing research topic")).toBeInTheDocument();
    expect(chatStatus()).toHaveTextContent("Assistant is analyzing the research topic.");

    stream.send({
      type: "tool-output-available",
      toolCallId: "call-1",
      output: {
        topic: "Microplastics in freshwater fish",
        researchScore: 74,
        complexity: "medium",
        keyQuestions: ["Which species are most exposed?"],
        recommendedNextSteps: ["Pick one river system."],
        summary: "A focused, researchable topic.",
      },
    });
    stream.send({ type: "finish-step" });
    stream.send({ type: "start-step" });
    stream.send({ type: "text-start", id: "t2" });
    stream.delta("The analysis is above.", "t2");
    stream.finish("t2");

    const card = await within(conversation).findByRole("article", {
      name: "Research analysis: Microplastics in freshwater fish",
    });
    expect(within(card).getByText("Which species are most exposed?")).toBeInTheDocument();
    expect(await within(conversation).findByText("The analysis is above.")).toBeInTheDocument();
  });
});
