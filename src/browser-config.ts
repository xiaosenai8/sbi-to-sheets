export function getBrowserAppName(): string | null {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--browser') {
      return args[i + 1] ?? null;
    }

    if (arg.startsWith('--browser=')) {
      return arg.slice('--browser='.length) || null;
    }
  }

  return null;
}
