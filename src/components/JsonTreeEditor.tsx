import {
  type ClipboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";
import { useLanguage } from "../context/LanguageContext";

type JsonPrimitive = string | number | boolean | null;
interface JsonArray extends Array<JsonValue> {}
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonPath = Array<string | number>;
type JsonType = "string" | "number" | "boolean" | "null" | "object" | "array";

interface JsonTreeEditorProps {
  value: JsonValue;
  onChange: (next: JsonValue) => void;
  onPasteJson?: (next: JsonValue) => void;
}

interface AddDraft {
  parentPath: JsonPath;
  kind: "object" | "array";
  key: string;
  type: JsonType;
  valueText: string;
  boolValue: boolean;
}

interface RemovedSnapshot {
  label: string;
  value: JsonValue;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}

function pathToKey(path: JsonPath): string {
  return JSON.stringify(path);
}

function isPathAffected(prefix: JsonPath, target: JsonPath): boolean {
  if (prefix.length < target.length) return false;
  return target.every((segment, index) => segment === prefix[index]);
}

function cloneAndSetValue(source: JsonValue, path: JsonPath, nextValue: JsonValue): JsonValue {
  if (path.length === 0) return nextValue;
  const [nextKey, ...rest] = path;

  if (Array.isArray(source)) {
    const index = Number(nextKey);
    const arrayCopy = [...source];
    arrayCopy[index] = cloneAndSetValue(source[index] as JsonValue, rest, nextValue);
    return arrayCopy;
  }

  if (isJsonObject(source)) {
    return {
      ...source,
      [String(nextKey)]: cloneAndSetValue(
        source[String(nextKey)] as JsonValue,
        rest,
        nextValue
      ),
    };
  }

  return source;
}

function cloneAndAddValue(
  source: JsonValue,
  path: JsonPath,
  key: string | null,
  nextValue: JsonValue
): JsonValue {
  if (path.length === 0) {
    if (Array.isArray(source)) return [...source, nextValue];
    if (isJsonObject(source) && key !== null) return { ...source, [key]: nextValue };
    return source;
  }

  const [nextKey, ...rest] = path;
  if (Array.isArray(source)) {
    const index = Number(nextKey);
    const arrayCopy = [...source];
    arrayCopy[index] = cloneAndAddValue(source[index] as JsonValue, rest, key, nextValue);
    return arrayCopy;
  }

  if (isJsonObject(source)) {
    const keyName = String(nextKey);
    return {
      ...source,
      [keyName]: cloneAndAddValue(source[keyName], rest, key, nextValue),
    };
  }

  return source;
}

function cloneAndDeleteValue(source: JsonValue, path: JsonPath): JsonValue {
  if (path.length === 0) return source;
  const [nextKey, ...rest] = path;

  if (Array.isArray(source)) {
    const index = Number(nextKey);
    const arrayCopy = [...source];
    if (rest.length === 0) {
      arrayCopy.splice(index, 1);
      return arrayCopy;
    }
    arrayCopy[index] = cloneAndDeleteValue(source[index] as JsonValue, rest);
    return arrayCopy;
  }

  if (isJsonObject(source)) {
    const keyName = String(nextKey);
    if (rest.length === 0) {
      const { [keyName]: removed, ...restObject } = source;
      void removed;
      return restObject;
    }
    return {
      ...source,
      [keyName]: cloneAndDeleteValue(source[keyName], rest),
    };
  }

  return source;
}

function getValueAtPath(source: JsonValue, path: JsonPath): JsonValue {
  if (path.length === 0) return source;
  const [nextKey, ...rest] = path;
  if (Array.isArray(source)) return getValueAtPath(source[Number(nextKey)] as JsonValue, rest);
  if (isJsonObject(source)) return getValueAtPath(source[String(nextKey)] as JsonValue, rest);
  return source;
}

function primitiveTypeOf(value: JsonPrimitive): "string" | "number" | "boolean" | "null" {
  if (value === null) return "null";
  return typeof value as "string" | "number" | "boolean";
}

function primitiveLabel(value: JsonPrimitive): string {
  if (value === null) return "null";
  return String(value);
}

function getObjectKey(base: string, source: JsonObject): string {
  const fallback = (base || "item").trim() || "item";
  if (!Object.prototype.hasOwnProperty.call(source, fallback)) return fallback;

  let index = 1;
  while (Object.prototype.hasOwnProperty.call(source, `${fallback}_${index}`)) index += 1;
  return `${fallback}_${index}`;
}

function makeDraftValue(draft: AddDraft): JsonValue {
  if (draft.type === "string") return draft.valueText;
  if (draft.type === "number") {
    const numberValue = Number(draft.valueText);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }
  if (draft.type === "boolean") return draft.boolValue;
  if (draft.type === "object") return {};
  if (draft.type === "array") return [];
  return null;
}

function Icon({ children }: { children: ReactNode }): JSX.Element {
  return (
    <svg className="json-tree__icon" viewBox="0 0 20 20" aria-hidden="true">
      {children}
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }): JSX.Element {
  return <Icon><path d={expanded ? "m5.5 7.5 4.5 4.5 4.5-4.5" : "m7.5 5.5 4.5 4.5-4.5 4.5"} /></Icon>;
}

function PlusIcon(): JSX.Element {
  return <Icon><path d="M10 4.5v11M4.5 10h11" /></Icon>;
}

function TrashIcon(): JSX.Element {
  return <Icon><path d="M4.5 6.5h11M8 3.5h4M7 8.5v6m3-6v6m3-6v6M5.5 6.5l.7 10h7.6l.7-10" /></Icon>;
}

function CheckIcon(): JSX.Element {
  return <Icon><path d="m4.5 10.5 3.3 3.2 7.7-7.5" /></Icon>;
}

function CloseIcon(): JSX.Element {
  return <Icon><path d="m5.5 5.5 9 9m0-9-9 9" /></Icon>;
}

function UndoIcon(): JSX.Element {
  return <Icon><path d="M7.5 6H4v-3.5M4.3 6a6.5 6.5 0 1 1-.4 7" /></Icon>;
}

interface AddRowProps {
  draft: AddDraft;
  onCancel: () => void;
  onCommit: () => void;
  onChangeKey: (next: string) => void;
  onChangeType: (next: JsonType) => void;
  onChangeValueText: (next: string) => void;
  onChangeBoolean: (next: boolean) => void;
}

function AddRow({
  draft,
  onCancel,
  onCommit,
  onChangeKey,
  onChangeType,
  onChangeValueText,
  onChangeBoolean,
}: AddRowProps): JSX.Element {
  const { t } = useLanguage();
  const isObject = draft.kind === "object";
  const isBoolean = draft.type === "boolean";
  const hasLiteralValue = !["null", "object", "array"].includes(draft.type);
  const saveLabel = t(isObject ? "jsonTree.saveField" : "jsonTree.saveItem");

  return (
    <div
      className="json-tree__row json-tree__row--add"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="json-tree__key json-tree__key--draft">
        <span className="json-tree__branch-spacer" aria-hidden="true" />
        {isObject ? (
          <input
            className="json-tree__input json-tree__input--key"
            aria-label={t("jsonTree.fieldName")}
            value={draft.key}
            placeholder={t("jsonTree.keyPlaceholder")}
            autoFocus
            onChange={(event) => onChangeKey(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommit();
              }
            }}
          />
        ) : (
          <span className="json-tree__label json-tree__label--new">{t("jsonTree.newItem")}</span>
        )}
      </div>

      <select
        className="json-tree__type-select"
        aria-label={t(isObject ? "jsonTree.typeForNewField" : "jsonTree.typeForNewItem")}
        autoFocus={!isObject}
        value={draft.type}
        onChange={(event) => onChangeType(event.target.value as JsonType)}
      >
        <option value="string">{t("jsonTree.type.string")}</option>
        <option value="number">{t("jsonTree.type.number")}</option>
        <option value="boolean">{t("jsonTree.type.boolean")}</option>
        <option value="null">{t("jsonTree.type.null")}</option>
        <option value="object">{t("jsonTree.type.object")}</option>
        <option value="array">{t("jsonTree.type.array")}</option>
      </select>

      <div className="json-tree__value json-tree__value--draft">
        {isBoolean ? (
          <label className="json-tree__bool json-tree__bool--draft">
            <input
              type="checkbox"
              aria-label={t(isObject ? "jsonTree.valueForNewField" : "jsonTree.valueForNewItem")}
              checked={draft.boolValue}
              onChange={(event) => onChangeBoolean(event.target.checked)}
            />
            <span>{draft.boolValue ? t("jsonTree.bool.true") : t("jsonTree.bool.false")}</span>
          </label>
        ) : hasLiteralValue ? (
          <input
            className="json-tree__input"
            type={draft.type === "number" ? "number" : "text"}
            step={draft.type === "number" ? "any" : undefined}
            aria-label={t(isObject ? "jsonTree.valueForNewField" : "jsonTree.valueForNewItem")}
            value={draft.valueText}
            onChange={(event) => onChangeValueText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommit();
              }
            }}
          />
        ) : (
          <span className="json-tree__literal" data-json-type={draft.type}>
            {t(`jsonTree.type.${draft.type}`)}
          </span>
        )}

        <div className="json-tree__draft-actions">
          <button type="button" className="json-tree__commit" onClick={onCommit}>
            <CheckIcon />
            <span>{saveLabel}</span>
          </button>
          <button
            type="button"
            className="json-tree__icon-button"
            onClick={onCancel}
            aria-label={t("jsonTree.cancelNew")}
            title={t("jsonTree.cancelNew")}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

interface TreeNodeProps {
  label: string;
  path: JsonPath;
  value: JsonValue;
  onChange: (path: JsonPath, next: JsonValue) => void;
  onRemoveNode: (path: JsonPath, label: string) => void;
  pendingAdd: AddDraft | null;
  onStartAdd: (path: JsonPath, kind: "object" | "array", key: string | null) => void;
  onCancelAdd: () => void;
  onUpdateDraftKey: (nextKey: string) => void;
  onUpdateDraftType: (nextType: JsonType) => void;
  onUpdateDraftValueText: (nextValueText: string) => void;
  onUpdateDraftBoolean: (nextValue: boolean) => void;
  onCommitDraft: () => void;
}

function TreeNode({
  label,
  path,
  value,
  onChange,
  onRemoveNode,
  pendingAdd,
  onStartAdd,
  onCancelAdd,
  onUpdateDraftKey,
  onUpdateDraftType,
  onUpdateDraftValueText,
  onUpdateDraftBoolean,
  onCommitDraft,
}: TreeNodeProps): JSX.Element {
  const { t } = useLanguage();
  const childrenId = useId();
  const [expanded, setExpanded] = useState(true);
  const isContainer = isJsonObject(value) || isJsonArray(value);
  const containerKind = isJsonArray(value) ? "array" : "object";
  const childCount = isJsonObject(value)
    ? Object.keys(value).length
    : isJsonArray(value)
      ? value.length
      : 0;
  const canRemove = path.length > 0;
  const thisNodeDraft = pendingAdd && pathToKey(pendingAdd.parentPath) === pathToKey(path);

  if (!isContainer) {
    const primitive = value as JsonPrimitive;
    const type = primitiveTypeOf(primitive);

    return (
      <div className="json-tree__row json-tree__row--primitive">
        <div className="json-tree__key">
          <span className="json-tree__branch-spacer" aria-hidden="true" />
          <span className="json-tree__label" title={label}>{label}</span>
        </div>
        <span className="json-tree__type" data-json-type={type}>
          {t(`jsonTree.type.${type}`)}
        </span>
        <div className="json-tree__value">
          {type === "null" ? (
            <span className="json-tree__literal" data-json-type="null">null</span>
          ) : type === "boolean" ? (
            <label className="json-tree__bool">
              <input
                type="checkbox"
                aria-label={t("jsonTree.valueFor", { label })}
                checked={primitive === true}
                onChange={(event) => onChange(path, event.target.checked)}
              />
              <span>{primitive === true ? t("jsonTree.bool.true") : t("jsonTree.bool.false")}</span>
            </label>
          ) : (
            <input
              className="json-tree__input"
              type={type === "number" ? "number" : "text"}
              step={type === "number" ? "any" : undefined}
              aria-label={t("jsonTree.valueFor", { label })}
              value={primitiveLabel(primitive)}
              onChange={(event) => {
                if (type === "number") {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next)) onChange(path, next);
                  return;
                }
                onChange(path, event.target.value);
              }}
            />
          )}
          {canRemove ? (
            <button
              type="button"
              className="json-tree__icon-button json-tree__icon-button--danger json-tree__remove"
              onClick={() => onRemoveNode(path, label)}
              aria-label={t("jsonTree.removeNode", { label })}
              title={t("jsonTree.removeNode", { label })}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const addLabel = t(containerKind === "object" ? "jsonTree.addFieldTo" : "jsonTree.addItemTo", {
    label,
  });

  return (
    <div className={`json-tree__group${path.length === 0 ? " json-tree__group--root" : ""}`}>
      <div className="json-tree__row json-tree__row--container">
        <div className="json-tree__key">
          <button
            type="button"
            className="json-tree__toggle"
            aria-label={t(expanded ? "jsonTree.collapse" : "jsonTree.expand", { key: label })}
            aria-expanded={expanded}
            aria-controls={childrenId}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronIcon expanded={expanded} />
          </button>
          <span className="json-tree__label json-tree__label--container" title={label}>{label}</span>
        </div>
        <span className="json-tree__type" data-json-type={containerKind}>
          {t(`jsonTree.type.${containerKind}`)}
        </span>
        <div className="json-tree__value json-tree__value--container">
          <span className="json-tree__count">
            {t(containerKind === "object" ? "jsonTree.fieldCount" : "jsonTree.itemCount", {
              count: childCount,
            })}
          </span>
          <button
            type="button"
            className="json-tree__add-button"
            onClick={() => {
              setExpanded(true);
              onStartAdd(
                path,
                containerKind,
                isJsonObject(value) ? getObjectKey("item", value) : null
              );
            }}
            aria-label={addLabel}
            title={addLabel}
          >
            <PlusIcon />
            <span>{t(containerKind === "object" ? "jsonTree.addField" : "jsonTree.addArrayItem")}</span>
          </button>
          {canRemove ? (
            <button
              type="button"
              className="json-tree__icon-button json-tree__icon-button--danger json-tree__remove"
              onClick={() => onRemoveNode(path, label)}
              aria-label={t("jsonTree.removeNode", { label })}
              title={t("jsonTree.removeNode", { label })}
            >
              <TrashIcon />
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="json-tree__nested" id={childrenId}>
          {childCount === 0 && !thisNodeDraft ? (
            <div className="json-tree__empty">{t("jsonTree.empty")}</div>
          ) : null}
          <ul className="json-tree__list">
            {isJsonObject(value)
              ? Object.entries(value).map(([childKey, child]) => (
                  <li key={childKey} className="json-tree__list-item">
                    <TreeNode
                      label={childKey}
                      path={[...path, childKey]}
                      value={child}
                      onChange={onChange}
                      onRemoveNode={onRemoveNode}
                      pendingAdd={pendingAdd}
                      onStartAdd={onStartAdd}
                      onCancelAdd={onCancelAdd}
                      onUpdateDraftKey={onUpdateDraftKey}
                      onUpdateDraftType={onUpdateDraftType}
                      onUpdateDraftValueText={onUpdateDraftValueText}
                      onUpdateDraftBoolean={onUpdateDraftBoolean}
                      onCommitDraft={onCommitDraft}
                    />
                  </li>
                ))
              : value.map((child, childIndex) => (
                  <li key={`${pathToKey(path)}-${childIndex}`} className="json-tree__list-item">
                    <TreeNode
                      label={`[${childIndex}]`}
                      path={[...path, childIndex]}
                      value={child}
                      onChange={onChange}
                      onRemoveNode={onRemoveNode}
                      pendingAdd={pendingAdd}
                      onStartAdd={onStartAdd}
                      onCancelAdd={onCancelAdd}
                      onUpdateDraftKey={onUpdateDraftKey}
                      onUpdateDraftType={onUpdateDraftType}
                      onUpdateDraftValueText={onUpdateDraftValueText}
                      onUpdateDraftBoolean={onUpdateDraftBoolean}
                      onCommitDraft={onCommitDraft}
                    />
                  </li>
                ))}
            {thisNodeDraft ? (
              <li className="json-tree__list-item">
                <AddRow
                  draft={pendingAdd}
                  onCancel={onCancelAdd}
                  onCommit={onCommitDraft}
                  onChangeKey={onUpdateDraftKey}
                  onChangeType={onUpdateDraftType}
                  onChangeValueText={onUpdateDraftValueText}
                  onChangeBoolean={onUpdateDraftBoolean}
                />
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function getRootCount(value: JsonValue): number {
  if (Array.isArray(value)) return value.length;
  if (isJsonObject(value)) return Object.keys(value).length;
  return 1;
}

export function JsonTreeEditor({ value, onChange, onPasteJson }: JsonTreeEditorProps): JSX.Element {
  const { t } = useLanguage();
  const root = useMemo<JsonValue>(() => value, [value]);
  const [pendingAdd, setPendingAdd] = useState<AddDraft | null>(null);
  const [removedSnapshot, setRemovedSnapshot] = useState<RemovedSnapshot | null>(null);

  const handlePasteJson = (event: ClipboardEvent<HTMLElement>) => {
    const target = event.target;
    if (
      !onPasteJson ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) return;

    const source = event.clipboardData.getData("text");
    if (!source) return;

    try {
      onPasteJson(JSON.parse(source) as JsonValue);
      setPendingAdd(null);
      setRemovedSnapshot(null);
      event.preventDefault();
    } catch {
      // Invalid JSON remains available to the browser instead of replacing the document.
    }
  };

  const handleAddChild = (path: JsonPath, key: string | null, next: JsonValue) => {
    setPendingAdd(null);
    setRemovedSnapshot(null);
    onChange(cloneAndAddValue(root, path, key, next));
  };

  const handleRemoveNode = (path: JsonPath, label: string) => {
    if (pendingAdd && isPathAffected(pendingAdd.parentPath, path)) setPendingAdd(null);
    setRemovedSnapshot({ label, value: root });
    onChange(cloneAndDeleteValue(root, path));
  };

  const handleStartAdd = (path: JsonPath, kind: "object" | "array", key: string | null) => {
    setRemovedSnapshot(null);
    setPendingAdd({
      parentPath: [...path],
      kind,
      key: key ?? "",
      type: "string",
      valueText: "",
      boolValue: false,
    });
  };

  const updateDraft = (update: Partial<AddDraft>) => {
    setPendingAdd((draft) => (draft ? { ...draft, ...update } : null));
  };

  const handleCommitDraft = () => {
    if (!pendingAdd) return;
    const parentNode = getValueAtPath(root, pendingAdd.parentPath);
    const nextValue = makeDraftValue(pendingAdd);
    const rawKey = pendingAdd.kind === "object" ? pendingAdd.key.trim() || "item" : "";
    const safeKey =
      pendingAdd.kind === "object" && isJsonObject(parentNode)
        ? getObjectKey(rawKey, parentNode)
        : null;
    handleAddChild(pendingAdd.parentPath, safeKey, nextValue);
  };

  const rootCount = getRootCount(root);
  const rootKind = isJsonObject(root) ? "object" : isJsonArray(root) ? "array" : "value";

  return (
    <section className="json-tree" aria-label={t("jsonTree.ariaLabel")} onPaste={handlePasteJson}>
      <header className="json-tree__toolbar">
        <div className="json-tree__title-group">
          <span className="json-tree__brand-mark" aria-hidden="true">{"{}"}</span>
          <div>
            <h3 className="json-tree__title">{t("jsonTree.title")}</h3>
            <p className="json-tree__paste-hint">{t("jsonTree.pasteHint")}</p>
          </div>
        </div>
        <span className="json-tree__document-meta">
          {t(`jsonTree.rootMeta.${rootKind}`, { count: rootCount })}
        </span>
      </header>

      <div className="json-tree__columns" aria-hidden="true">
        <span>{t("jsonTree.column.key")}</span>
        <span>{t("jsonTree.column.type")}</span>
        <span>{t("jsonTree.column.value")}</span>
      </div>

      <div className="json-tree__viewport" tabIndex={0}>
        <TreeNode
          label={t("jsonTree.rootLabel")}
          path={[]}
          value={root}
          onChange={(path, next) => {
            setRemovedSnapshot(null);
            onChange(cloneAndSetValue(root, path, next));
          }}
          onRemoveNode={handleRemoveNode}
          pendingAdd={pendingAdd}
          onStartAdd={handleStartAdd}
          onCancelAdd={() => setPendingAdd(null)}
          onUpdateDraftKey={(key) => updateDraft({ key })}
          onUpdateDraftType={(type) => updateDraft({ type })}
          onUpdateDraftValueText={(valueText) => updateDraft({ valueText })}
          onUpdateDraftBoolean={(boolValue) => updateDraft({ boolValue })}
          onCommitDraft={handleCommitDraft}
        />
      </div>

      {removedSnapshot ? (
        <div className="json-tree__undo" role="status">
          <span>{t("jsonTree.removed", { label: removedSnapshot.label })}</span>
          <button
            type="button"
            onClick={() => {
              onChange(removedSnapshot.value);
              setRemovedSnapshot(null);
            }}
          >
            <UndoIcon />
            <span>{t("jsonTree.undo")}</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
