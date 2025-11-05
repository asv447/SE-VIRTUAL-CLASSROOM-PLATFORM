import { ObjectId } from "mongodb";

const MIN_OPTIONS = 2;

const isBoolean = (value) => typeof value === "boolean";
const isString = (value) => typeof value === "string";

const cloneArray = (values) => Array.from(new Set(Array.isArray(values) ? values.filter(Boolean) : []));

const fallbackOptions = (poll) =>
  Array.isArray(poll?.options)
    ? poll.options.map((option) => ({ id: option.id, text: option.text }))
    : [];

const createOptionId = () => new ObjectId().toString();

export const clonePoll = (poll) => {
  if (!poll) {
    return null;
  }
  return JSON.parse(JSON.stringify(poll));
};

export const sanitizePollInput = (input, existingPoll = null) => {
  if (!input && !existingPoll) {
    return null;
  }

  const basePoll = existingPoll
    ? {
        ...existingPoll,
        options: Array.isArray(existingPoll.options)
          ? existingPoll.options.map((option) => ({
              ...option,
              voters: cloneArray(option?.voters),
            }))
          : [],
      }
    : null;
  const source = input && typeof input === "object" ? input : {};

  const questionCandidate = isString(source.question) ? source.question.trim() : "";
  const question = questionCandidate || basePoll?.question || "";

  const allowMultiple = isBoolean(source.allowMultiple)
    ? source.allowMultiple
    : Boolean(basePoll?.allowMultiple);

  const isEnabled = isBoolean(source.isEnabled)
    ? source.isEnabled
    : basePoll?.isEnabled ?? true;

  const providedOptions = Array.isArray(source.options) && source.options.length > 0
    ? source.options
    : fallbackOptions(basePoll);

  const nextOptions = [];
  const seenIds = new Set();

  providedOptions.forEach((option) => {
    const label = isString(option?.text) ? option.text.trim() : "";
    if (!label) {
      return;
    }

    let id = isString(option?.id) && option.id.trim() ? option.id.trim() : null;
    if (!id || seenIds.has(id)) {
      id = createOptionId();
    }
    seenIds.add(id);

    const previousOption = basePoll?.options?.find((item) => item.id === id);

    nextOptions.push({
      id,
      text: label,
      voters: cloneArray(previousOption?.voters),
    });
  });

  if (!question || nextOptions.length < MIN_OPTIONS) {
    if (basePoll) {
      return {
        ...basePoll,
        allowMultiple,
        isEnabled,
        updatedAt: new Date(),
      };
    }
    return null;
  }

  return {
    question,
    allowMultiple,
    isEnabled,
    options: nextOptions,
    createdAt: basePoll?.createdAt || new Date(),
    updatedAt: new Date(),
  };
};
