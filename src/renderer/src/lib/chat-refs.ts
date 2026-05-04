// Shared refs between ChatInput and WhisperSuggest

// Set true by ChatInput.handleKeyDown when Tab is intercepted; checked + reset by WhisperSuggest's keydown listener
export var tabHandledRef: { current: boolean } = { current: false }