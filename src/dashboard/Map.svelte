<script>
    export let width;
    export let height;
    export let trajectory;
    export let position;

    $: extent = trajectory.reduce(
        (max, point) => Math.max(max, Math.abs(point.x), Math.abs(point.y)),
        Math.max(1, Math.abs(position?.x ?? 0), Math.abs(position?.y ?? 0))
    );
    $: gridStep = 10 ** Math.max(
        1,
        Math.floor(Math.log10(extent / Math.min(2, Math.max(1, extent / 100))))
    );
    $: gridPositions = Array.from(
        { length: Math.floor(extent / gridStep) },
        (_, index) => (index + 1) * gridStep
    );
    $: centerX = width / 2;
    $: centerY = height / 2;
    $: plotRadius = Math.max(1, Math.min(width, height) / 2 - 46);
    $: scale = plotRadius / extent;
    $: axisLeft = 22;
    $: axisRight = width - 22;
    $: axisTop = 22;
    $: axisBottom = height - 22;
    $: robotX = centerX - (position?.y ?? 0) * scale;
    $: robotY = centerY - (position?.x ?? 0) * scale;
    $: robotRotation = -90 - ((position?.theta ?? 0) * 180 / Math.PI);
    $: trajectoryPoints = trajectory
        .map(point => `${centerX - point.y * scale},${centerY - point.x * scale}`)
        .join(' ');

    function format(value) {
        return Number.isFinite(value) ? value.toFixed(3) : '--';
    }
</script>

<svg class="map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Robot position and heading on the XY axes">
    {#each gridPositions as gridPosition}
        <line class="grid" x1={centerX - gridPosition * scale} y1={axisTop} x2={centerX - gridPosition * scale} y2={axisBottom} />
        <line class="grid" x1={centerX + gridPosition * scale} y1={axisTop} x2={centerX + gridPosition * scale} y2={axisBottom} />
        <line class="grid" x1={axisLeft} y1={centerY - gridPosition * scale} x2={axisRight} y2={centerY - gridPosition * scale} />
        <line class="grid" x1={axisLeft} y1={centerY + gridPosition * scale} x2={axisRight} y2={centerY + gridPosition * scale} />
    {/each}
    <line class="axis" x1={centerX} y1={axisBottom} x2={centerX} y2={axisTop} />
    <line class="axis" x1={axisLeft} y1={centerY} x2={axisRight} y2={centerY} />
    <path class="axis" d={`M ${centerX - 4} ${axisTop + 8} L ${centerX} ${axisTop} L ${centerX + 4} ${axisTop + 8}`} />
    <path class="axis" d={`M ${axisLeft + 8} ${centerY - 4} L ${axisLeft} ${centerY} L ${axisLeft + 8} ${centerY + 4}`} />
    <line class="tick" x1={centerX - 4} y1={centerY - plotRadius} x2={centerX + 4} y2={centerY - plotRadius} />
    <line class="tick" x1={centerX - 4} y1={centerY + plotRadius} x2={centerX + 4} y2={centerY + plotRadius} />
    <line class="tick" x1={centerX - plotRadius} y1={centerY - 4} x2={centerX - plotRadius} y2={centerY + 4} />
    <line class="tick" x1={centerX + plotRadius} y1={centerY - 4} x2={centerX + plotRadius} y2={centerY + 4} />
    <circle class="origin" cx={centerX} cy={centerY} r="2.5" />
    <text class="axis-label" x={centerX + 8} y={axisTop - 7}>X</text>
    <text class="axis-label" x={axisLeft - 8} y={centerY + 2}>Y</text>
    <text class="scale-label" x={centerX + 25} y={centerY - plotRadius + 3} text-anchor="middle">+{format(extent)}</text>
    <text class="scale-label" x={centerX + 25} y={centerY + plotRadius + 2} text-anchor="middle">-{format(extent)}</text>
    <text class="scale-label" x={axisLeft + 4} y={centerY - 8} text-anchor="middle">-{format(extent)}</text>
    <text class="scale-label" x={axisRight - 4} y={centerY + 8} text-anchor="middle">+{format(extent)}</text>
    {#if trajectory.length > 1}
        <polyline class="trajectory" points={trajectoryPoints} />
    {/if}
    {#if position}
        <circle class="latest-sample" cx={robotX} cy={robotY} r="3.5" />
        <g transform={`translate(${robotX} ${robotY}) rotate(${robotRotation})`}>
            <polygon class="robot" points="10,0 -7,-6 -7,6" />
        </g>
    {/if}
</svg>

<style>
    .map {
        display: block;
        width: 100%;
        height: auto;
        margin: 8px auto 0;
        overflow: visible;
    }

    .axis {
        fill: none;
        stroke: var(--vscode-descriptionForeground);
        stroke-width: 1;
    }

    .grid {
        stroke: var(--vscode-descriptionForeground);
        stroke-opacity: 0.2;
        stroke-width: 0.5;
    }

    .origin {
        fill: var(--vscode-descriptionForeground);
    }

    .trajectory {
        fill: none;
        stroke: var(--vscode-charts-orange, var(--vscode-foreground));
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .latest-sample {
        fill: var(--vscode-charts-orange, var(--vscode-foreground));
    }

    .tick {
        stroke: var(--vscode-descriptionForeground);
        stroke-width: 1;
    }

    .scale-label {
        fill: var(--vscode-descriptionForeground);
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 7px;
    }

    .axis-label {
        fill: var(--vscode-descriptionForeground);
        font-family: var(--vscode-font-family);
        font-size: 10px;
    }

    .robot {
        fill: var(--vscode-charts-blue);
        stroke: var(--vscode-foreground);
        stroke-width: 1.5;
        stroke-linejoin: round;
    }
</style>
