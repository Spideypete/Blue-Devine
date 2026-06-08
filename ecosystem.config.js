module.exports = {
  apps: [
    {
      name: 'evrima-bot',
      script: 'npm',
      args: 'start',
      cwd: '/home/container',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'evrima-web',
      script: 'node',
      args: 'src/web/server.js',
      cwd: '/home/container',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
