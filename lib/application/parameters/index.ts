// Barrel for the stale-propagation use cases (Unit 2.5) and the link-
// suggestion read model (Unit 3.4).

export {
  setParameterValue,
  confirmParameterLink,
  removeParameterLink,
  previewRemoveParameterLinkImpact,
  type SetParameterValueResult,
  type ConfirmParameterLinkResult,
  type RemoveParameterLinkResult,
  type PreviewRemoveParameterLinkImpactResult,
  type StalePropagationError,
  type StalePropagationErrorCode,
} from "./stale-propagation";

export {
  buildConfigurationSuggestionIndex,
  describeLinkSuggestions,
  MAX_LINK_SUGGESTIONS_PER_FIELD,
  type ConfigurationSuggestionIndex,
  type LinkSuggestionSourceView,
  type LinkSuggestionSourceKind,
} from "./suggest-link-sources";
