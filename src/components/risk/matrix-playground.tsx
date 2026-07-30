"use client";

import * as React from "react";
import { TileMatrix, type MatrixValue } from "@/components/risk/tile-matrix";

/** The interactive matrix, wired up for the design-system preview. */
export function MatrixPlayground() {
  const [value, setValue] = React.useState<MatrixValue | null>({
    likelihood: 3,
    severity: 4,
  });

  return (
    <div className="space-y-3">
      <p className="eyebrow">Interactive</p>
      <TileMatrix value={value} onChange={setValue} />
      <p className="font-mono text-data-xs text-muted">
        {value
          ? `likelihood ${value.likelihood} × severity ${value.severity} = ${value.likelihood * value.severity}`
          : "nothing selected"}
      </p>
    </div>
  );
}
