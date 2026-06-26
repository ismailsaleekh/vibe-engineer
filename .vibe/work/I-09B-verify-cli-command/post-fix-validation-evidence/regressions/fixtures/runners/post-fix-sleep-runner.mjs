const ms = Number(process.argv[2] || 1000);
await new Promise((resolve) => setTimeout(resolve, ms));
