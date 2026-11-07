if (process.env.CF_PAGES === '1') {
  console.error('This project now requires Workers Static Assets. Connect main to Workers Builds and disable the old Pages build. See DEPLOYMENT.md.');
  process.exit(1);
}
