import { useEffect, useMemo, useState } from "react";
import ExpandableDemo from "../framework/ExpandableDemo";
import CapsuleTabs from "../framework/CapsuleTabs";
import InlineMath from "../framework/InlineMath";
import ParamSlider from "../framework/ParamSlider";

type CountingMode =
  "permutation" | "combination" | "repeat-permutation" | "repeat-combination";

const MAX_ENUMERATED = 120;
const SYMBOLS = "ABCDEFGH".split("");

const MODE_OPTIONS: { id: CountingMode; label: string }[] = [
  { id: "permutation", label: "无重复排列" },
  { id: "combination", label: "无重复组合" },
  { id: "repeat-permutation", label: "可重复排列" },
  { id: "repeat-combination", label: "可重复组合" },
];

const MODE_DETAILS: Record<
  CountingMode,
  { order: string; repeat: string; hint: string }
> = {
  permutation: {
    order: "顺序不同算不同",
    repeat: "不可重复",
    hint: "适合职位、密码位置等有先后次序的选取。",
  },
  combination: {
    order: "只看选中的集合",
    repeat: "不可重复",
    hint: "适合组队、抽样等只关心成员的选取。",
  },
  "repeat-permutation": {
    order: "顺序不同算不同",
    repeat: "允许重复",
    hint: "每个位置都可重新选择同一个元素。",
  },
  "repeat-combination": {
    order: "只看选中的多重集合",
    repeat: "允许重复",
    hint: "适合购买多件同类物品等不计顺序的重复选取。",
  },
};

function factorial(value: number): number {
  let result = 1;
  for (let i = 2; i <= value; i += 1) result *= i;
  return result;
}

function choose(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  const reducedR = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= reducedR; i += 1) {
    result = (result * (n - reducedR + i)) / i;
  }
  return result;
}

function count(mode: CountingMode, n: number, r: number): number {
  if ((mode === "permutation" || mode === "combination") && r > n) {
    return 0;
  }
  if (mode === "permutation") return factorial(n) / factorial(n - r);
  if (mode === "combination") return choose(n, r);
  if (mode === "repeat-permutation") return n ** r;
  return choose(n + r - 1, r);
}

function formula(mode: CountingMode): string {
  if (mode === "permutation") return "P(n,r)=\\frac{n!}{(n-r)!}";
  if (mode === "combination") return "\\binom{n}{r}=\\frac{n!}{r!(n-r)!}";
  if (mode === "repeat-permutation") return "n^r";
  return "\\binom{n+r-1}{r}";
}

function description(mode: CountingMode): string {
  if (mode === "permutation") return "顺序不同算不同，元素不能重复。";
  if (mode === "combination") return "只看选中的集合，元素不能重复。";
  if (mode === "repeat-permutation")
    return "顺序不同算不同，每个位置都可重新选择。";
  return "只看选中的多重集合，元素可以重复。";
}

function enumerate(
  mode: CountingMode,
  n: number,
  r: number,
  limit: number,
): string[] | null {
  const total = count(mode, n, r);
  if (total > limit) return null;
  if ((mode === "permutation" || mode === "combination") && r > n) {
    return [];
  }

  const results: string[] = [];
  const path: string[] = [];
  const used = new Set<number>();

  const visit = (start: number, allowRepeat: boolean) => {
    if (path.length === r) {
      results.push(path.join(""));
      return;
    }
    for (let index = allowRepeat ? start : 0; index < n; index += 1) {
      if (!allowRepeat && used.has(index)) continue;
      if (mode === "combination" || mode === "repeat-combination") {
        if (index < start) continue;
      }
      path.push(SYMBOLS[index]);
      if (!allowRepeat) used.add(index);
      visit(
        mode === "combination" || mode === "repeat-combination" ? index : start,
        allowRepeat,
      );
      if (!allowRepeat) used.delete(index);
      path.pop();
    }
  };

  if (r === 0) return [""];
  visit(0, mode === "repeat-permutation" || mode === "repeat-combination");
  return results;
}

export default function CombinatoricsCountingDemo() {
  const [n, setN] = useState(4);
  const [r, setR] = useState(2);
  const [mode, setMode] = useState<CountingMode>("permutation");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [picked, setPicked] = useState<number[]>([]);

  const total = count(mode, n, r);
  const isInvalid = (mode === "permutation" || mode === "combination") && r > n;
  const items = useMemo(
    () => (isInvalid ? [] : enumerate(mode, n, r, MAX_ENUMERATED)),
    [isInvalid, mode, n, r],
  );
  const isTooLarge = !isInvalid && total > MAX_ENUMERATED;
  const detail = MODE_DETAILS[mode];
  const selected =
    selectedItem && items?.includes(selectedItem) ? selectedItem : items?.[0];

  useEffect(() => {
    setSelectedItem(null);
    setPicked([]);
  }, [mode, n, r]);

  const isRepeatMode =
    mode === "repeat-permutation" || mode === "repeat-combination";
  const isCombinationMode =
    mode === "combination" || mode === "repeat-combination";
  const manualResult = picked.map((index) => SYMBOLS[index]).join("");

  const handlePick = (index: number) => {
    if (r === 0) return;
    if (isRepeatMode) {
      if (picked.length < r) setPicked((current) => [...current, index]);
      return;
    }
    if (isCombinationMode) {
      setPicked((current) => {
        if (current.includes(index))
          return current.filter((item) => item !== index);
        if (current.length >= r) return current;
        return [...current, index].sort((a, b) => a - b);
      });
      return;
    }
    if (!picked.includes(index) && picked.length < r) {
      setPicked((current) => [...current, index]);
    }
  };

  return (
    <ExpandableDemo id="combinatorics-counting">
      <div className="rounded-lg border border-border p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <CapsuleTabs
              options={MODE_OPTIONS}
              value={mode}
              onChange={(id) => setMode(id as CountingMode)}
              size="xs"
              label="模式："
              className="flex-wrap"
            />
            <ParamSlider
              label={
                <span>
                  总体元素数 <InlineMath tex="n" />
                </span>
              }
              value={n}
              min={1}
              max={8}
              step={1}
              display={String(n)}
              digits={0}
              onChange={setN}
            />
            <ParamSlider
              label={
                <span>
                  选取数量 <InlineMath tex="r" />
                </span>
              }
              value={r}
              min={0}
              max={8}
              step={1}
              display={String(r)}
              digits={0}
              onChange={setR}
            />
          </div>

          <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
            <p>
              <span className="mr-2">公式：</span>
              <InlineMath tex={formula(mode)} />
            </p>
            <p aria-live="polite">
              <span className="mr-2">结果：</span>
              <span className="font-mono text-ink">
                {isInvalid ? "无定义" : total}
              </span>
            </p>
            <p className="sm:col-span-2 text-xs">
              {detail.order}；{detail.repeat}。{detail.hint}
            </p>
          </div>

          <p
            className={isInvalid ? "text-destructive" : "text-xs text-muted"}
            aria-live="polite"
          >
            {isInvalid
              ? "无重复模式要求 r ≤ n，请减小 r 或切换到可重复模式。"
              : description(mode)}
          </p>

          <div className="border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">自己构造一个结果</p>
              <button
                type="button"
                className="text-xs text-muted underline underline-offset-4 hover:text-accent"
                onClick={() => setPicked([])}
              >
                重置选择
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">
              {isCombinationMode
                ? "点击元素进行选择，再次点击可取消。"
                : "按顺序点击元素，构造各个位置。"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SYMBOLS.slice(0, n).map((symbol, index) => {
                const isPicked = picked.includes(index);
                const disabled =
                  !isRepeatMode && !isCombinationMode && isPicked;
                return (
                  <button
                    type="button"
                    className="btn btn-ghost font-mono"
                    key={symbol}
                    aria-pressed={isPicked}
                    aria-label={`选择元素 ${symbol}`}
                    disabled={disabled}
                    onClick={() => handlePick(index)}
                  >
                    {symbol}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">位置：</span>
              {Array.from({ length: r }, (_, index) => {
                const value = picked[index];
                return (
                  <button
                    type="button"
                    className="min-w-8 border-b border-border px-2 py-1 text-center font-mono text-accent hover:border-accent"
                    key={index}
                    aria-label={
                      value === undefined
                        ? `第 ${index + 1} 个位置为空`
                        : `移除第 ${index + 1} 个位置`
                    }
                    onClick={() => {
                      if (value === undefined) return;
                      setPicked((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      );
                    }}
                  >
                    {value === undefined ? "·" : SYMBOLS[value]}
                  </button>
                );
              })}
              <span className="ml-1 font-mono text-ink">
                {manualResult || "∅"}
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">小规模枚举</p>
              <span className="text-small text-muted">
                {isInvalid
                  ? "当前参数不可用"
                  : `显示 ${items?.length ?? 0} / ${total} 项`}
              </span>
            </div>
            {isTooLarge ? (
              <p className="text-muted">
                结果超过 {MAX_ENUMERATED}{" "}
                项，为保持交互流畅暂不展开；公式计数仍然有效。
              </p>
            ) : (
              <div
                className="grid grid-cols-4 gap-x-3 gap-y-1.5 text-sm sm:grid-cols-6"
                role="group"
                aria-label="枚举结果"
              >
                {items?.map((item, index) => (
                  <button
                    type="button"
                    className={`text-left font-mono text-muted transition-colors hover:text-accent ${selected === item ? "text-accent underline decoration-accent underline-offset-4" : ""}`}
                    key={`${item}-${index}`}
                    aria-label={`选择结果 ${item || "空集"}`}
                    aria-pressed={selected === item}
                    onClick={() => setSelectedItem(item)}
                  >
                    {item || "∅"}
                  </button>
                ))}
              </div>
            )}
            {!isInvalid && selected !== undefined && (
              <p className="mt-2 text-xs text-muted" aria-live="polite">
                当前选中{" "}
                <span className="font-mono text-accent">{selected || "∅"}</span>
                ；
                {mode === "combination" || mode === "repeat-combination"
                  ? "交换顺序不会产生新结果。"
                  : "交换顺序会产生新的结果。"}
              </p>
            )}
          </div>
        </div>
      </div>
    </ExpandableDemo>
  );
}
