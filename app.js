const prompts = [
  {
    id: "customer-chatbot",
    title: "Customer data and public AI",
    text:
      "A coworker wants to paste a spreadsheet with customer names, emails, and support notes into a public AI tool to summarize themes. Explain what you would do and why.",
    sample:
      "I would not paste that spreadsheet into a public AI chatbot because it includes personal customer data and potentially confidential support details. The safer path is to use an approved enterprise AI tool, remove or mask direct identifiers, share only the minimum data needed for the summary, and confirm the use is allowed by policy. If customer details are not needed, I would aggregate the notes first and keep the output in an approved location with the right access controls.",
    criteria: [
      {
        label: "Mentions customer names, emails, or other personal details",
        terms: ["personal", "pii", "customer", "names", "email", "identifiable"]
      },
      {
        label: "Does not use public or unapproved AI for customer data",
        terms: ["public", "external", "unapproved", "not approved", "chatbot", "vendor"]
      },
      {
        label: "Uses only needed information or removes identifiers",
        terms: ["minimize", "minimum", "de-identify", "anonymize", "mask", "remove"]
      },
      {
        label: "Uses an approved company tool",
        terms: ["approved", "enterprise", "secure", "company", "internal"]
      },
      {
        label: "Keeps the summary in a safe place and limits who can see it",
        terms: ["access", "permission", "store", "storage", "share", "controls"]
      }
    ]
  },
  {
    id: "employee-review",
    title: "Employee comments and AI summaries",
    text:
      "A manager wants to use AI to summarize employee comments for performance-review themes. Explain what needs to happen first.",
    sample:
      "Employee comments can contain sensitive employment information, so I would first confirm the purpose, policy basis, and who is allowed to use the data. I would limit the dataset to what is necessary, remove direct identifiers when possible, use an approved AI environment, and make sure only authorized HR or leadership users can see the inputs and outputs. I would also treat the AI summary as a draft that needs human review before it influences any employment decision.",
    criteria: [
      {
        label: "Calls out employee comments as sensitive",
        terms: ["employee", "sensitive", "hr", "employment", "performance"]
      },
      {
        label: "Checks whether this use is allowed",
        terms: ["purpose", "policy", "consent", "legal", "allowed", "basis"]
      },
      {
        label: "Uses only the comments needed",
        terms: ["minimize", "minimum", "necessary", "relevant", "limit"]
      },
      {
        label: "Limits access to approved people",
        terms: ["access", "authorized", "permission", "role", "controls"]
      },
      {
        label: "Has a person review before decisions",
        terms: ["human", "review", "validate", "decision", "draft"]
      }
    ]
  },
  {
    id: "policy-output",
    title: "AI answers from internal policy",
    text:
      "An AI tool gives a helpful answer from internal policy documents. Explain how you would check it and share it safely.",
    sample:
      "I would verify the answer against the source policy and make sure it does not include personal, confidential, or restricted details from the documents. I would save it only in an approved work location, label or classify it correctly, and share it only with people who have a business need and permission to view it. If the answer will guide a decision, I would cite the source and have a qualified person review it before broad distribution.",
    criteria: [
      {
        label: "Checks the AI answer against the source policy",
        terms: ["verify", "validate", "check", "source", "policy", "citation", "cite"]
      },
      {
        label: "Removes private or confidential details",
        terms: ["private", "confidential", "personal", "sensitive", "restricted"]
      },
      {
        label: "Saves it in an approved place",
        terms: ["store", "save", "approved", "location", "repository"]
      },
      {
        label: "Shares only with people who need it",
        terms: ["share", "access", "permission", "authorized", "business need"]
      },
      {
        label: "Labels or reviews it before reuse",
        terms: ["classify", "classification", "label", "review", "owner"]
      }
    ]
  }
];

const PASS_SCORE = 80;
const MAX_MISSED_FOR_PASS = 1;

const state = {
  currentIndex: 0,
  responses: prompts.map(() => null),
  events: [],
  summaryVisible: false
};

const els = {
  completionStatus: document.querySelector("#completionStatus"),
  progressSteps: document.querySelector("#progressSteps"),
  promptPanel: document.querySelector("#promptPanel"),
  promptCount: document.querySelector("#promptCount"),
  promptTitle: document.querySelector("#promptTitle"),
  promptText: document.querySelector("#promptText"),
  responseInput: document.querySelector("#responseInput"),
  submitButton: document.querySelector("#submitButton"),
  resetButton: document.querySelector("#resetButton"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  scoreRing: document.querySelector("#scoreRing"),
  scoreValue: document.querySelector("#scoreValue"),
  feedbackTitle: document.querySelector("#feedbackTitle"),
  feedbackSummary: document.querySelector("#feedbackSummary"),
  remediationCallout: document.querySelector("#remediationCallout"),
  metList: document.querySelector("#metList"),
  missedList: document.querySelector("#missedList"),
  feedbackActions: document.querySelector("#feedbackActions"),
  nextButton: document.querySelector("#nextButton"),
  averageScore: document.querySelector("#averageScore"),
  averageMeter: document.querySelector("#averageMeter"),
  snapshotCopy: document.querySelector("#snapshotCopy"),
  summaryPanel: document.querySelector("#summaryPanel"),
  summaryTitle: document.querySelector("#summaryTitle"),
  summaryNarrative: document.querySelector("#summaryNarrative"),
  summaryScore: document.querySelector("#summaryScore"),
  summaryOutcome: document.querySelector("#summaryOutcome"),
  summaryMastery: document.querySelector("#summaryMastery"),
  summaryAttempts: document.querySelector("#summaryAttempts"),
  summaryPromptList: document.querySelector("#summaryPromptList"),
  summaryTags: document.querySelector("#summaryTags"),
  summaryPayload: document.querySelector("#summaryPayload"),
  copySummaryButton: document.querySelector("#copySummaryButton"),
  reviewButton: document.querySelector("#reviewButton"),
  eventCount: document.querySelector("#eventCount"),
  eventLog: document.querySelector("#eventLog"),
  copyPayloadButton: document.querySelector("#copyPayloadButton")
};

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function criterionMatched(response, terms) {
  const normalized = normalize(response);
  return terms.some((term) => normalized.includes(term));
}

function scoreResponse(prompt, response) {
  const trimmed = response.trim();
  const met = [];
  const missed = [];

  prompt.criteria.forEach((criterion) => {
    if (criterionMatched(trimmed, criterion.terms)) {
      met.push(criterion.label);
    } else {
      missed.push(criterion.label);
    }
  });

  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const lengthScore = Math.min(20, Math.floor(wordCount / 5));
  const criteriaScore = met.length * 16;
  const score = Math.min(100, criteriaScore + lengthScore);
  const passed = score >= PASS_SCORE && missed.length <= MAX_MISSED_FOR_PASS;

  return {
    score,
    passed,
    met,
    missed,
    wordCount
  };
}

function feedbackForScore(result) {
  if (result.score >= 86) {
    return {
      title: "Strong answer",
      summary:
        "You included the key safety steps. This is clear enough to use as a workplace answer."
    };
  }

  if (result.score >= 68) {
    return {
      title: "Solid start",
      summary:
        "You included some of the right points. Add the missing safety steps below to make the answer complete."
    };
  }

  if (result.score >= 45) {
    return {
      title: "Needs more detail",
      summary:
        "You have part of the answer. Add the missing items below so the safer action is clear."
    };
  }

  return {
    title: "Needs revision",
    summary:
      "Start with what data is private, why it needs care, and what safer option you would use."
  };
}

function createEvent(type, details = {}) {
  const event = {
    type,
    activityId: "ai-data-privacy-practice",
    questionId: prompts[state.currentIndex].id,
    timestamp: new Date().toISOString(),
    ...details
  };

  state.events.unshift(event);
  renderDashboard();
}

function getCompletedResponses() {
  return state.responses.filter(Boolean);
}

function getAverageScore() {
  const completed = getCompletedResponses();

  return completed.length
    ? Math.round(completed.reduce((sum, response) => sum + response.score, 0) / completed.length)
    : 0;
}

function getPassedResponses() {
  return state.responses.filter((response) => response?.passed);
}

function allPromptsPassed() {
  return getPassedResponses().length === prompts.length;
}

function getTotalAttempts() {
  return state.responses.reduce((sum, response) => sum + (response?.attempts || 0), 0);
}

function getActivityStatus() {
  if (allPromptsPassed()) {
    return "complete";
  }

  if (state.responses.some((response) => response && !response.passed)) {
    return "needs_revision";
  }

  return "in_progress";
}

function getFirstRevisionIndex() {
  return state.responses.findIndex((response) => response && !response.passed);
}

function getLmsPayload() {
  const completed = getCompletedResponses();
  const average = getAverageScore();
  const status = getActivityStatus();

  return {
    activityId: "ai-data-privacy-practice",
    activityName: "AI Data Privacy Practice",
    passScore: PASS_SCORE,
    maxMissingItemsForPass: MAX_MISSED_FOR_PASS,
    completion: status === "complete",
    status,
    score: completed.length ? average : null,
    progress: {
      completedQuestions: getPassedResponses().length,
      totalQuestions: prompts.length,
      totalAttempts: getTotalAttempts()
    },
    questionResults: prompts.map((prompt, index) => {
      const response = state.responses[index];

      return {
        questionId: prompt.id,
        title: prompt.title,
        status: response ? (response.passed ? "complete" : "needs_revision") : "not_started",
        score: response?.score ?? null,
        attempts: response?.attempts ?? 0,
        missedItems: response?.missed ?? []
      };
    }),
    events: state.events
  };
}

function getSummaryTags() {
  const gapCounts = new Map();

  state.responses.forEach((response) => {
    response?.missed.forEach((gap) => {
      gapCounts.set(gap, (gapCounts.get(gap) || 0) + 1);
    });
  });

  const topGaps = [...gapCounts.entries()].sort((a, b) => b[1] - a[1]).map(([gap]) => gap);

  if (allPromptsPassed()) {
    return [
      "Ready to mark complete",
      "Data privacy practice complete",
      topGaps.length ? `Optional review: ${topGaps[0]}` : "Ready for the next AI Academy activity"
    ];
  }

  if (!topGaps.length) {
    return ["In progress", "Waiting for more responses"];
  }

  return topGaps.slice(0, 3).map((gap) => `Review: ${gap}`);
}

function renderSteps() {
  els.progressSteps.innerHTML = "";

  prompts.forEach((prompt, index) => {
    const result = state.responses[index];
    const isCurrent = index === state.currentIndex && !state.summaryVisible;
    const statusClass = result?.passed
      ? " is-complete"
      : result
        ? " needs-remediation"
        : isCurrent
          ? " in-progress"
          : "";
    const statusLabel = result?.passed
      ? "Complete"
      : result
        ? "Needs revision"
        : isCurrent
          ? "In progress"
          : "Not started";
    const button = document.createElement("button");
    button.className = `step-button${statusClass}`;
    button.type = "button";
    button.setAttribute("aria-current", isCurrent ? "step" : "false");
    button.setAttribute("aria-label", `Question ${index + 1}: ${prompt.title}. ${statusLabel}.`);
    button.innerHTML = `
      <span class="step-dot" role="img" aria-label="${statusLabel}" title="${statusLabel}"></span>
      <span class="step-text">
        <span class="step-title">${index + 1}. ${prompt.title}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      state.currentIndex = index;
      renderPrompt();
    });
    els.progressSteps.appendChild(button);
  });
}

function renderPrompt() {
  const prompt = prompts[state.currentIndex];
  const saved = state.responses[state.currentIndex];
  state.summaryVisible = false;

  els.promptPanel.classList.remove("is-hidden");
  els.summaryPanel.classList.add("is-hidden");
  els.promptCount.textContent = `Question ${state.currentIndex + 1} of ${
    prompts.length
  } | ${PASS_SCORE}+ to continue`;
  els.promptTitle.textContent = prompt.title;
  els.promptText.textContent = prompt.text;
  els.responseInput.value = saved?.response || "";
  els.submitButton.textContent = saved ? "Resubmit response" : "Submit response";

  if (saved) {
    renderFeedback(saved);
  } else {
    els.feedbackPanel.classList.add("is-hidden");
  }

  renderSteps();
  renderDashboard();
}

function renderFeedback(result) {
  const feedback = feedbackForScore(result);
  els.feedbackPanel.classList.remove("is-hidden");
  els.scoreRing.style.setProperty("--score", `${result.score}%`);
  els.scoreValue.textContent = result.score;
  els.feedbackTitle.textContent = feedback.title;
  els.feedbackSummary.textContent = feedback.summary;
  els.remediationCallout.classList.toggle("is-passed", result.passed);
  els.remediationCallout.textContent = result.passed
    ? `Looks good. You included what was needed for this question.`
    : `Needs revision. You did include some correct points, but the answer is not complete yet. Edit your response above, then select Resubmit response.`;
  els.metList.innerHTML = "";
  els.missedList.innerHTML = "";

  const metItems = result.met.length ? result.met : ["No checklist items showed up yet."];
  const missedItems = result.missed.length ? result.missed : ["Looks complete."];

  metItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.metList.appendChild(li);
  });

  missedItems.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    els.missedList.appendChild(li);
  });

  els.nextButton.textContent =
    state.currentIndex === prompts.length - 1 ? "Finish" : "Next question";
  els.feedbackActions.classList.toggle("is-hidden", !result.passed);
  els.nextButton.classList.toggle("is-hidden", !result.passed);
  els.nextButton.disabled = !result.passed;
}

function renderDashboard() {
  const completed = getCompletedResponses();
  const completedCount = completed.length;
  const passedCount = getPassedResponses().length;
  const average = getAverageScore();
  const status = getActivityStatus();

  els.averageScore.textContent = completedCount ? `${average}/100 average` : "No score yet";
  els.averageMeter.style.width = `${average}%`;
  els.snapshotCopy.textContent = completedCount
    ? `${passedCount} of ${prompts.length} questions complete. ${
        status === "complete"
          ? "Ready to mark complete."
          : status === "needs_revision"
            ? "One or more answers need revision before completion."
            : "Continue to finish the data-privacy practice."
      }`
    : "Submit your response to see feedback.";
  els.completionStatus.textContent =
    status === "complete" ? "Complete" : `${passedCount}/${prompts.length} complete`;
  els.eventCount.textContent = `${state.events.length} ${
    state.events.length === 1 ? "event" : "events"
  }`;
  els.eventLog.textContent = JSON.stringify(getLmsPayload(), null, 2);
}

function renderSummary() {
  createEvent("summary_viewed", {
    questionId: "summary",
    score: getAverageScore(),
    status: getActivityStatus()
  });

  const payload = getLmsPayload();
  const tags = getSummaryTags();
  const passed = payload.status === "complete";

  state.summaryVisible = true;
  els.promptPanel.classList.add("is-hidden");
  els.feedbackPanel.classList.add("is-hidden");
  els.summaryPanel.classList.remove("is-hidden");
  els.summaryTitle.textContent = passed ? "Ready to mark complete" : "Needs revision";
  els.summaryNarrative.textContent = passed
    ? "The learner answered all three data privacy questions clearly. This page shows the score and the record the LMS could save."
    : "One or more answers still need revision before this should be marked complete.";
  els.summaryScore.textContent = payload.score ?? 0;
  els.summaryOutcome.textContent = passed ? "Complete" : "Needs revision";
  els.summaryMastery.textContent = `${payload.progress.completedQuestions}/${payload.progress.totalQuestions}`;
  els.summaryAttempts.textContent = payload.progress.totalAttempts;
  els.summaryPromptList.innerHTML = "";
  els.summaryTags.innerHTML = "";

  payload.questionResults.forEach((result) => {
    const li = document.createElement("li");
    const statusText = result.status.replace("_", " ");
    li.textContent = `${result.title}: ${result.score ?? "--"}/100, ${statusText}, ${
      result.attempts
    } attempt${result.attempts === 1 ? "" : "s"}`;
    els.summaryPromptList.appendChild(li);
  });

  tags.forEach((tag) => {
    const li = document.createElement("li");
    li.textContent = tag;
    els.summaryTags.appendChild(li);
  });

  els.summaryPayload.textContent = JSON.stringify(payload, null, 2);
  renderSteps();
}

function submitResponse() {
  const prompt = prompts[state.currentIndex];
  const response = els.responseInput.value;
  const previous = state.responses[state.currentIndex];
  const result = {
    response: response.trim(),
    submittedAt: new Date().toISOString(),
    attempts: (previous?.attempts || 0) + 1,
    ...scoreResponse(prompt, response)
  };

  state.responses[state.currentIndex] = result;
  els.submitButton.textContent = "Resubmit response";
  renderFeedback(result);
  renderSteps();
  createEvent("teach_back_submitted", {
    score: result.score,
    wordCount: result.wordCount,
    passed: result.passed,
    attempts: result.attempts,
    includedItems: result.met,
    missedItems: result.missed
  });
}

function clearCurrentResponse() {
  state.responses[state.currentIndex] = null;
  els.responseInput.value = "";
  els.submitButton.textContent = "Submit response";
  els.feedbackPanel.classList.add("is-hidden");
  renderSteps();
  renderDashboard();
  createEvent("response_cleared");
}

function moveNext() {
  const currentResponse = state.responses[state.currentIndex];

  if (!currentResponse) {
    els.responseInput.focus();
    createEvent("submission_missing");
    return;
  }

  if (!currentResponse.passed) {
    renderFeedback(currentResponse);
    els.responseInput.focus();
    createEvent("revision_needed", {
      score: currentResponse.score,
      missedItems: currentResponse.missed
    });
    return;
  }

  if (state.currentIndex < prompts.length - 1) {
    state.currentIndex += 1;
    renderPrompt();
    createEvent("question_viewed");
    return;
  }

  if (!allPromptsPassed()) {
    const revisionIndex = getFirstRevisionIndex();
    state.currentIndex = revisionIndex >= 0 ? revisionIndex : 0;
    renderPrompt();
    createEvent("activity_revision_needed", {
      questionId: prompts[state.currentIndex].id
    });
    return;
  }

  createEvent("activity_completed", {
    questionId: "summary",
    completedQuestions: getCompletedResponses().length,
    score: getAverageScore()
  });
  renderSummary();
}

function copyTextFromElement(element, button) {
  navigator.clipboard
    .writeText(element.textContent)
    .then(() => {
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1400);
    })
    .catch(() => {
      button.textContent = "Select log";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 1400);
    });
}

function copyPayload() {
  copyTextFromElement(els.eventLog, els.copyPayloadButton);
}

els.submitButton.addEventListener("click", submitResponse);
els.resetButton.addEventListener("click", clearCurrentResponse);
els.nextButton.addEventListener("click", moveNext);
els.copyPayloadButton.addEventListener("click", copyPayload);
els.copySummaryButton.addEventListener("click", () => {
  copyTextFromElement(els.summaryPayload, els.copySummaryButton);
});
els.reviewButton.addEventListener("click", () => {
  state.currentIndex = 0;
  renderPrompt();
});

renderPrompt();
createEvent("activity_started");
