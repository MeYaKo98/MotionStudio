<script>
    const vscode = acquireVsCodeApi();
    const logoSrc = document.getElementById('app')?.dataset.logoSrc ?? '';
    let connected = false;
    let position = null;
    let trajectory = [];
    let scale = 64;
    let robotX = 110;
    let robotY = 110;
    let robotRotation = 0;
    let trajectoryPoints = '';

    function format(value) {
        return Number.isFinite(value) ? value.toFixed(3) : '--';
    }

    function isValidPosition(value) {
        return value !== null && typeof value === 'object' &&
            Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.theta);
    }

    function resetTrajectory() {
        vscode.postMessage({ type: 'reset-trajectory' });
    }

    window.addEventListener('message', event => {
        const state = event.data;
        if (state?.type !== 'dashboard-state') {
            return;
        }

        connected = state.connected;
        position = isValidPosition(state.position) ? state.position : null;
        trajectory = Array.isArray(state.trajectory) ? state.trajectory.filter(isValidPosition) : [];
    });

    $: extent = trajectory.reduce(
        (max, point) => Math.max(max, Math.abs(point.x), Math.abs(point.y)),
        Math.max(1, Math.abs(position?.x ?? 0), Math.abs(position?.y ?? 0))
    );
    $: scale = 64 / extent;
    $: robotX = 110 + (position?.x ?? 0) * scale;
    $: robotY = 110 - (position?.y ?? 0) * scale;
    $: robotRotation = -((position?.theta ?? 0) * 180 / Math.PI);
    $: trajectoryPoints = trajectory
        .map(point => `${110 + point.x * scale},${110 - point.y * scale}`)
        .join(' ');

    vscode.postMessage({ type: 'ready' });
</script>

<main class="dashboard">
    <header>
        <img class="logo" src={logoSrc} alt="Motion Robotics Framework" />
        <div class="connection-row">
            <span class:connected class="connection" aria-live="polite">
                {connected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    </header>

    {#if !connected}
        <p class="notice">Connect to a Motion Link device to view live data.</p>
    {/if}

    <section aria-labelledby="position-heading">
        <div class="section-heading">
            <h3 id="position-heading">Position</h3>
            <button type="button" class="reset-button" onclick={resetTrajectory}
                title="Reset trajectory">
                Reset
            </button>
        </div>
        <dl>
            <div class="metric">
                <dt>X</dt>
                <dd>{format(position?.x)}</dd>
            </div>
            <div class="metric">
                <dt>Y</dt>
                <dd>{format(position?.y)}</dd>
            </div>
            <div class="metric">
                <dt>Theta</dt>
                <dd>{format(position?.theta)}</dd>
            </div>
        </dl>

        <svg class="map" viewBox="0 0 220 220" role="img" aria-label="Robot position and heading on the XY axes">
            <line class="axis" x1="22" y1="110" x2="198" y2="110" />
            <line class="axis" x1="110" y1="198" x2="110" y2="22" />
            <path class="axis" d="M 190 106 L 198 110 L 190 114" />
            <path class="axis" d="M 106 30 L 110 22 L 114 30" />
            <line class="tick" x1="46" y1="106" x2="46" y2="114" />
            <line class="tick" x1="174" y1="106" x2="174" y2="114" />
            <line class="tick" x1="106" y1="46" x2="114" y2="46" />
            <line class="tick" x1="106" y1="174" x2="114" y2="174" />
            <circle class="origin" cx="110" cy="110" r="2.5" />
            <text class="axis-label" x="202" y="114">X</text>
            <text class="axis-label" x="114" y="18">Y</text>
            <text class="scale-label" x="46" y="128" text-anchor="middle">-{format(extent)}</text>
            <text class="scale-label" x="174" y="128" text-anchor="middle">+{format(extent)}</text>
            <text class="scale-label" x="118" y="49">+{format(extent)}</text>
            <text class="scale-label" x="118" y="177">-{format(extent)}</text>
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
    </section>
    
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        font-family: var(--vscode-font-family);
    }

    .dashboard {
        padding: 12px;
    }

    header {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 8px;
    }

    .logo {
        display: block;
        width: 100%;
        max-width: 400px;
        object-fit: contain;
        object-position: left center;
    }

    :global(body.vscode-light) .logo {
        filter: invert(1);
    }

    .connection-row {
        display: flex;
        justify-content: flex-end;
    }

    .connection {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
    }

    .connection::before {
        display: inline-block;
        width: 7px;
        height: 7px;
        margin-right: 6px;
        border-radius: 50%;
        background: var(--vscode-descriptionForeground);
        content: '';
    }

    .connection.connected::before {
        background: var(--vscode-testing-iconPassed);
    }

    h3 {
        margin: 16px 0 4px;
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .reset-button {
        padding: 3px 8px;
        color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
        background: var(--vscode-button-secondaryBackground, transparent);
        border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
        border-radius: 2px;
        font: inherit;
        cursor: pointer;
    }

    .reset-button:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }

    .reset-button:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
    }

    dl {
        margin: 0;
    }

    .map {
        display: block;
        width: 100%;
        max-width: 240px;
        height: auto;
        margin: 8px auto 0;
        overflow: visible;
    }

    .axis {
        fill: none;
        stroke: var(--vscode-descriptionForeground);
        stroke-width: 1;
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

    .metric {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 8px 0;
        border-bottom: 1px solid var(--vscode-panel-border);
    }

    dt {
        color: var(--vscode-descriptionForeground);
        font-size: 12px;
    }

    dd {
        margin: 0;
        font-family: var(--vscode-editor-font-family, monospace);
        font-size: 13px;
        font-variant-numeric: tabular-nums;
    }

    .notice,
    .notice {
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
        line-height: 1.5;
    }

    .notice {
        margin: 12px 0 0;
    }

</style>