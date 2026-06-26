const mode = process.argv[2] || 'both';
const count = Number(process.argv[3] || 256);
if (mode === 'stdout' || mode === 'both') process.stdout.write('O'.repeat(count));
if (mode === 'stderr' || mode === 'both') process.stderr.write('E'.repeat(count));
