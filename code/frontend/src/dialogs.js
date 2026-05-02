/**
 * Global utility for custom alerts, confirms, and prompts.
 * This dispatches events that the GlobalOverlay component listens to.
 */

export function toast(message, type = "info") {
  window.dispatchEvent(new CustomEvent("toast", { detail: { message, type } }));
}

export function customAlert(message) {
  // Can just map alert to toast for simplicity, or we could make a blocking modal.
  // We'll use error toast for alerts, or a generic modal if you prefer.
  // For most usages in this app, an alert is showing an error or success.
  const type = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("required") ? "error" : "success";
  toast(message, type);
}

export function confirmDialog(title, message = "") {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("confirmDialog", {
        detail: {
          title,
          message,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        },
      })
    );
  });
}

export function promptDialog(title, defaultValue = "") {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("promptDialog", {
        detail: {
          title,
          defaultValue,
          onSubmit: (val) => resolve(val),
          onCancel: () => resolve(null),
        },
      })
    );
  });
}
