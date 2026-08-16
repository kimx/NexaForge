export interface AdSlotProps {
  position: "tool-result" | "home";
}

export function AdSlot({ position }: AdSlotProps): JSX.Element {
  return (
    <section className="ad-slot" aria-label="Advertisement">
      <div>Advertisement ({position})</div>
    </section>
  );
}
