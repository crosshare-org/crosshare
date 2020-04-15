export function timeString(elapsed: number): string {
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed - (hours * 3600)) / 60);
  const seconds = Math.floor(elapsed - (hours * 3600) - (minutes * 60));
  return hours + ':' +
    (minutes < 10 ? "0" : "") + minutes + ':' +
    (seconds < 10 ? "0" : "") + seconds;
}
