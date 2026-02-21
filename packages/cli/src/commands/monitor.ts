import type { MonitorArgs } from "../args";
import { renderDashboard } from "../live-dashboard";
import { LanternaServer } from "../ws-server";

/**
 * Run the `lanterna monitor` command.
 *
 * Starts a WebSocket server and displays a live terminal dashboard
 * showing connected apps and their real-time metrics.
 */
export async function runMonitor(args: MonitorArgs): Promise<number> {
	const server = new LanternaServer(args.port);

	server.on((event) => {
		switch (event.type) {
			case "appConnected":
				// Dashboard will auto-update
				break;
			case "appDisconnected":
				// Dashboard will auto-update
				break;
			case "metricsReceived":
				refreshDashboard(server);
				break;
			case "error":
				console.error(`Error: ${event.message}`);
				break;
		}
	});

	server.start();
	console.log(renderDashboard(server.connectedApps, server.serverPort, true));
	console.log(`\nWebSocket server listening on ws://localhost:${args.port}`);
	console.log("Waiting for apps to connect...\n");

	// Keep process alive
	await new Promise<void>((resolve) => {
		const handler = () => {
			server.stop();
			console.log("\nMonitor stopped.");
			resolve();
		};

		process.on("SIGINT", handler);
		process.on("SIGTERM", handler);
	});

	return 0;
}

function refreshDashboard(server: LanternaServer): void {
	// Clear and redraw
	process.stdout.write("\x1b[2J\x1b[H");
	console.log(renderDashboard(server.connectedApps, server.serverPort, true));
}
