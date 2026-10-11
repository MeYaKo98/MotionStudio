<script>
    import Map from './Map.svelte';

    const vscode = acquireVsCodeApi();
    const logoSrc = document.getElementById('app')?.dataset.logoSrc ?? '';
    let connected = false;
    let position = null;
    let trajectory = [];
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

    function openCli() {
        vscode.postMessage({ type: 'open-cli' });
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
            <div class="button-group">
                <button type="button" class="secondary-button" onclick={openCli}
                    title="Open Motion CLI">
                    CLI
                </button>
                <button type="button" class="reset-button" onclick={resetTrajectory}
                    title="Reset trajectory">
                    Reset
                </button>
            </div>
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

        <Map width={300} height={300} {trajectory} {position} />
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
        gap: 8px;
    }

    .button-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .secondary-button,
    .reset-button {
        padding: 3px 8px;
        color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
        background: var(--vscode-button-secondaryBackground, transparent);
        border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
        border-radius: 2px;
        font: inherit;
        cursor: pointer;
    }

    .secondary-button:hover:not(:disabled),
    .reset-button:hover:not(:disabled) {
        background: var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground));
    }

    .secondary-button:focus-visible,
    .reset-button:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
    }

    dl {
        margin: 0;
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