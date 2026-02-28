"use strict";
{
    const C3 = globalThis.C3;

    C3.Behaviors.FedericoCalchera_TriggerTimer.timer = class Timer {
        constructor(length, isRegular, useSystemDt) {
            this.time = length;
            this.duration = length;
            this.totalTime = 0;
            this.isPaused = false;
            this.isRegular = isRegular;
            this.useSystemDt = useSystemDt;
        };
    }

    C3.Behaviors.FedericoCalchera_TriggerTimer.Instance = class TriggerTimerInstance extends globalThis.ISDKBehaviorInstanceBase {
        constructor() {
            super();

            const properties = this._getInitProperties();
            if (properties) {
                // ... read properties ...
            }

            this._timers = new Map;
            this._lastTimerTag = "";
        }


        _saveToJson() {
            return Object.fromEntries(this._timers);
        }


        _loadFromJson(o) {
            this._timers = new Map(Object.entries(o));
            if (this._timers.size > 0) this._setTicking(true)
        }


        _tick() {
            const dt = this.instance.dt;
            const dtSys = this.runtime.dt;
            for (const [tag, timer] of this._timers.entries()) {
                if (timer.isPaused) continue;
                const tdt = timer.useSystemDt ? dtSys : dt;
                timer.time -= tdt;
                timer.totalTime += tdt;
                if (timer.time > 0) continue;

                this._lastTimerTag = tag;
                this._trigger(C3.Behaviors.FedericoCalchera_TriggerTimer.Cnds.Onanytimer);
                this._trigger(C3.Behaviors.FedericoCalchera_TriggerTimer.Cnds.Ontimer);

                if (timer.isRegular) {
                    timer.time += timer.duration;
                }
                else if (this._timers.get(tag).time <= 0) {
                    this._timers.delete(tag);
                    if (this._timers.size === 0) this._setTicking(false);
                }
                
            }
        }


        _getDebuggerProperties() {
            return [{
                title: "TriggerTimers",
                properties: [...this._timers.entries()].map((e => ({
                    name: "$" + e[0],
                    value: `${Math.round(10 * e[1].time) / 10} / ${Math.round(10 * e[1].duration) / 10}`
                })))
            }]
        }

    };
}