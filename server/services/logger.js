const debugLogs = [];

export const addLog = (msg) => {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  debugLogs.push(formatted);
  if (debugLogs.length > 500) debugLogs.shift();
};

export const getLogs = () => {
  return debugLogs;
};
