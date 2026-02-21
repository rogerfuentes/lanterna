const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
	private interval: ReturnType<typeof setInterval> | null = null;
	private frameIndex = 0;

	start(message: string): void {
		this.frameIndex = 0;
		process.stdout.write(`\r${FRAMES[0]} ${message}`);
		this.interval = setInterval(() => {
			this.frameIndex = (this.frameIndex + 1) % FRAMES.length;
			process.stdout.write(`\r${FRAMES[this.frameIndex]} ${message}`);
		}, 80);
	}

	update(message: string): void {
		if (this.interval) {
			process.stdout.write(`\r${FRAMES[this.frameIndex]} ${message}`);
		}
	}

	stop(message?: string): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		if (message) {
			process.stdout.write(`\r✓ ${message}\n`);
		} else {
			process.stdout.write("\r\x1b[K");
		}
	}

	fail(message: string): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		process.stdout.write(`\r✗ ${message}\n`);
	}
}
