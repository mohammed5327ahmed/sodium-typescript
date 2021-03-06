import { CellLoop, Transaction, TimerSystem, MillisecondsTimerSystem } from "../../lib/Sodium";

export function startClock() {
  document.getElementById('desc').innerHTML = `The above clock is driven by sodium<br/>DevInit.ts can be used for any live dev testing :)`;

  Transaction.run(() => {
    periodic(new MillisecondsTimerSystem(), 1)
      .listen(outputTime);
  });

  function periodic(sys: TimerSystem, period: number) {
    const oAlarm = new CellLoop<number>();
    const sAlarm = sys.at(oAlarm);

    oAlarm.loop(
      sAlarm
        .map(t => t + period)
        .hold(sys.time.sample() + period));
    return oAlarm;
  }

  function outputTime() {
    const padLeft = (n: number) => (v: number) => String(Array(n).fill("0") + v.toString()).slice(-n);

    const format2 = padLeft(2);
    const format3 = padLeft(3);
    const output = document.getElementById("output");

    const now = new Date();

    const hr = format2(now.getHours());
    const min = format2(now.getMinutes());
    const sec = format2(now.getSeconds());
    const ms = format3(now.getMilliseconds());

    document.getElementById("output").innerHTML = `${hr}:${min}:${sec}:${ms}`;
  }
}
