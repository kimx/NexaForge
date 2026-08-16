import { type ClipboardEvent, useMemo, useState } from "react";
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
  if (prefix.length < target.length) {
    return false;
  }

  return target.every((segment, index) => segment === prefix[index]);
}

function cloneAndSetValue(
  source: JsonValue,
  path: JsonPath,
  nextValue: JsonValue
): JsonValue {
  if (path.length === 0) {
    return nextValue;
  }

  const [nextKey, ...rest] = path;
  if (Array.isArray(source)) {
    const index = Number(nextKey);
    const arrayCopy = [...source];
    arrayCopy[index] = cloneAndSetValue(
      source[index] as JsonValue,
      rest,
      nextValue
    );
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
    if (Array.isArray(source)) {
      return [...source, nextValue];
    }

    if (isJsonObject(source) && key !== null) {
      return { ...source, [key]: nextValue };
    }

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
  if (path.length === 0) {
    return source;
  }

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
      const { [keyName]: _remove, ...restObject } = source;
      void _remove;
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
  if (path.length === 0) {
    return source;
  }

  const [nextKey, ...rest] = path;
  if (Array.isArray(source)) {
    return getValueAtPath(source[Number(nextKey)] as JsonValue, rest);
  }

  if (isJsonObject(source)) {
    return getValueAtPath(source[String(nextKey)] as JsonValue, rest);
  }

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
  if (!Object.prototype.hasOwnProperty.call(source, fallback)) {
    return fallback;
  }

  let index = 1;
  while (Object.prototype.hasOwnProperty.call(source, `${fallback}_${index}`)) {
    index += 1;
  }

  return `${fallback}_${index}`;
}

function makeDraftValue(draft: AddDraft): JsonValue {
  if (draft.type === "string") {
    return draft.valueText;
  }

  if (draft.type === "number") {
    const numberValue = Number(draft.valueText);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  if (draft.type === "boolean") {
    return draft.boolValue;
  }

  if (draft.type === "object") {
    return {};
  }

  if (draft.type === "array") {
    return [];
  }

  return null;
}

interface AddRowProps {
  kind: "object" | "array";
  draft: AddDraft;
  onCancel: () => void;
  onCommit: () => void;
  onChangeKey: (next: string) => void;
  onChangeType: (next: JsonType) => void;
  onChangeValueText: (next: string) => void;
  onChangeBoolean: (next: boolean) => void;
}

function AddRow({
  kind,
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
  const isFreeType = draft.type === "null" || draft.type === "object" || draft.type === "array";

  return (
    <div className="json-tree__row json-tree__row--add">
      {isObject ? (
        <input
          className="json-tree__input"
          value={draft.key}
          placeholder={t("jsonTree.keyPlaceholder")}
          onChange={(event) => onChangeKey(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommit();
            }
          }}
        />
      ) : (
        <span className="json-tree__label">{t("jsonTree.new")}</span>
      )}
      <select
        className="json-tree__type json-tree__type--select"
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
      <div className="json-tree__value">
        {isBoolean ? (
          <label className="json-tree__bool">
            <input
              type="checkbox"
              checked={draft.boolValue}
              onChange={(event) => onChangeBoolean(event.target.checked)}
            />
            {t("jsonTree.type.boolean")}
          </label>
        ) : isFreeType ? (
          <span className="json-tree__null">{t(`jsonTree.type.${draft.type}`)}</span>
        ) : (
          <input
            className="json-tree__input"
            type={draft.type === "number" ? "number" : "text"}
            step={draft.type === "number" ? "any" : undefined}
            value={draft.valueText}
            onChange={(event) => onChangeValueText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommit();
              }
            }}
          />
        )}
        <button
          type="button"
          className="json-tree__action"
          onClick={onCommit}
          aria-label={t("jsonTree.confirm")}
          title={t("jsonTree.confirm")}
        >
          ✓
        </button>
        <button
          type="button"
          className="json-tree__action"
          onClick={onCancel}
          aria-label={t("jsonTree.cancel")}
          title={t("jsonTree.cancel")}
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface TreeNodeProps {
  label: string;
  path: JsonPath;
  value: JsonValue;
  onChange: (path: JsonPath, next: JsonValue) => void;
  onAddChild: (path: JsonPath, key: string | null, next: JsonValue) => void;
  onRemoveNode: (path: JsonPath) => void;
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
  onAddChild,
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
  const childCount =
    isJsonObject(value)
      ? Object.keys(value).length
      : isJsonArray(value)
        ? value.length
        : 0;

  const setValue = (next: JsonValue) => onChange(path, next);
  const canRemove = path.length > 0;
  const removeSelf = () => onRemoveNode(path);

  const addObjectChild = () => {
    if (!isJsonObject(value)) {
      return;
    }

    onStartAdd(path, "object", getObjectKey("item", value));
  };

  const addArrayChild = () => {
    if (!Array.isArray(value)) {
      return;
    }

    onStartAdd(path, "array", null);
  };

  const thisNodeDraft = pendingAdd && pathToKey(pendingAdd.parentPath) === pathToKey(path);

  if (!isJsonObject(value) && !Array.isArray(value)) {
    const primitive = value as JsonPrimitive;
    const type = primitiveTypeOf(primitive);

    return (
      <div className="json-tree__row">
        <span className="json-tree__label">{label}</span>
        <span className="json-tree__type">{t(`jsonTree.type.${type}`)}</span>
        <div className="json-tree__value">
          {type === "null" ? (
            <span className="json-tree__null">{t("jsonTree.type.null")}</span>
          ) : type === "boolean" ? (
            <label className="json-tree__bool">
              <input
                type="checkbox"
                checked={primitive === true}
                onChange={(event) => setValue(event.target.checked)}
              />
              {primitive === true ? t("jsonTree.bool.true") : t("jsonTree.bool.false")}
            </label>
          ) : type === "number" ? (
            <input
              className="json-tree__input"
              type="number"
              step="any"
              value={primitiveLabel(primitive)}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) {
                  return;
                }
                setValue(next);
              }}
            />
          ) : (
            <input
              className="json-tree__input"
              type="text"
              value={primitiveLabel(primitive)}
              onChange={(event) => setValue(event.target.value)}
            />
          )}
          {canRemove ? (
            <button
              type="button"
              className="json-tree__action"
              onClick={removeSelf}
              aria-label={t("jsonTree.remove")}
              title={t("jsonTree.remove")}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <details className="json-tree__group" open>
      <summary className="json-tree__summary">
        <span className="json-tree__label">{label}</span>
        <div className="json-tree__summary-actions">
          {Array.isArray(value) ? (
            <button
              type="button"
              className="json-tree__action"
              onClick={addArrayChild}
              aria-label={t("jsonTree.add")}
              title={t("jsonTree.add")}
            >
              +
            </button>
          ) : null}
          {isJsonObject(value) ? (
            <button
              type="button"
              className="json-tree__action"
              onClick={addObjectChild}
              aria-label={t("jsonTree.add")}
              title={t("jsonTree.add")}
            >
              +
            </button>
          ) : null}
          {canRemove ? (
            <button
              type="button"
              className="json-tree__action"
              onClick={removeSelf}
              aria-label={t("jsonTree.remove")}
              title={t("jsonTree.remove")}
            >
              ×
            </button>
          ) : null}
          <span className="json-tree__badge">
            {isJsonObject(value)
              ? t("jsonTree.badge.object", { count: childCount })
              : t("jsonTree.badge.array", { count: childCount })}
          </span>
        </div>
      </summary>
      <div className="json-tree__nested">
        {childCount === 0 ? <div className="json-tree__empty">{t("jsonTree.empty")}</div> : null}
        {isJsonObject(value) ? (
          <ul className="json-tree__list">
            {Object.entries(value).map(([childKey, child]) => (
              <li key={childKey} className="json-tree__list-item">
                <TreeNode
                  label={childKey}
                  path={[...path, childKey]}
                  value={child}
                  onChange={onChange}
                  onAddChild={onAddChild}
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
                  kind="object"
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
        ) : isJsonArray(value) ? (
          <ul className="json-tree__list">
            {value.map((child: JsonValue, childIndex: number) => (
              <li key={`${path.join(".")}-${childIndex}`} className="json-tree__list-item">
                <TreeNode
                  label={`[${childIndex}]`}
                  path={[...path, childIndex]}
                  value={child}
                  onChange={onChange}
                  onAddChild={onAddChild}
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
                  kind="array"
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
        ) : null}
      </div>
    </details>
  );
}

export function JsonTreeEditor({
  value,
  onChange,
  onPasteJson,
}: JsonTreeEditorProps): JSX.Element {
  const { t } = useLanguage();
  const root = useMemo<JsonValue>(() => value, [value]);
  const [pendingAdd, setPendingAdd] = useState<AddDraft | null>(null);

  const handlePasteJson = (event: ClipboardEvent<HTMLDivElement>) => {
    const source = event.clipboardData.getData("text");
    if (!source) {
      return;
    }

    try {
      const next = JSON.parse(source);
      if (onPasteJson) {
        onPasteJson(next);
      }
      event.preventDefault();
    } catch {
      // 當貼上文字不是合法 JSON 時，維持原本行為，交由其它欄位處理。
    }
  };

  const handleAddChild = (path: JsonPath, key: string | null, next: JsonValue) => {
    setPendingAdd(null);
    onChange(cloneAndAddValue(root, path, key, next));
  };

  const handleRemoveNode = (path: JsonPath) => {
    if (pendingAdd && isPathAffected(pendingAdd.parentPath, path)) {
      setPendingAdd(null);
    }

    onChange(cloneAndDeleteValue(root, path));
  };

  const handleStartAdd = (path: JsonPath, kind: "object" | "array", key: string | null) => {
    setPendingAdd({
      parentPath: [...path],
      kind,
      key: key ?? "",
      type: "string",
      valueText: "",
      boolValue: false,
    });
  };

  const handleUpdateDraftKey = (nextKey: string) => {
    setPendingAdd((draft) => {
      if (!draft) {
        return null;
      }

      return { ...draft, key: nextKey };
    });
  };

  const handleUpdateDraftType = (nextType: JsonType) => {
    setPendingAdd((draft) => {
      if (!draft) {
        return null;
      }

      return { ...draft, type: nextType };
    });
  };

  const handleUpdateDraftValueText = (nextValueText: string) => {
    setPendingAdd((draft) => {
      if (!draft) {
        return null;
      }

      return { ...draft, valueText: nextValueText };
    });
  };

  const handleUpdateDraftBoolean = (nextValue: boolean) => {
    setPendingAdd((draft) => {
      if (!draft) {
        return null;
      }

      return { ...draft, boolValue: nextValue };
    });
  };

  const handleCommitDraft = () => {
    if (!pendingAdd) {
      return;
    }

    const parentNode = getValueAtPath(root, pendingAdd.parentPath);
    const nextValue = makeDraftValue(pendingAdd);
    const rawKey = pendingAdd.kind === "object" ? pendingAdd.key.trim() || "item" : "";
    const safeKey =
      pendingAdd.kind === "object" && isJsonObject(parentNode)
        ? getObjectKey(rawKey, parentNode)
        : null;

    handleAddChild(pendingAdd.parentPath, safeKey, nextValue);
  };

  return (
    <div className="json-tree" tabIndex={0} onPaste={handlePasteJson} aria-label={t("jsonTree.ariaLabel")}>
      <p className="json-tree__paste-hint">{t("jsonTree.pasteHint")}</p>
      <TreeNode
        label={t("jsonTree.rootLabel")}
        path={[]}
        value={root}
        onChange={(path, next) => onChange(cloneAndSetValue(root, path, next))}
        onAddChild={handleAddChild}
        onRemoveNode={handleRemoveNode}
        pendingAdd={pendingAdd}
        onStartAdd={handleStartAdd}
        onCancelAdd={() => setPendingAdd(null)}
        onUpdateDraftKey={handleUpdateDraftKey}
        onUpdateDraftType={handleUpdateDraftType}
        onUpdateDraftValueText={handleUpdateDraftValueText}
        onUpdateDraftBoolean={handleUpdateDraftBoolean}
        onCommitDraft={handleCommitDraft}
      />
    </div>
  );
}
