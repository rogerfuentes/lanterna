export interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export type CommandRunner = (cmd: string, args: string[]) => Promise<ExecResult>;

export const defaultRunner: CommandRunner = async (cmd, args) => {
	try {
		const proc = Bun.spawn([cmd, ...args], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		const exitCode = await proc.exited;
		return { stdout, stderr, exitCode };
	} catch {
		return { stdout: "", stderr: `Command not found: ${cmd}`, exitCode: 127 };
	}
};
