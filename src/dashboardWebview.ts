import { mount } from 'svelte';
import Dashboard from './Dashboard.svelte';

const target = document.getElementById('app');
if (target) {
    mount(Dashboard, { target });
}