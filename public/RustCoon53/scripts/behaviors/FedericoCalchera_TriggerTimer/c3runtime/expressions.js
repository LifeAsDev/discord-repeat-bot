"use strict";
{
    globalThis.C3.Behaviors.FedericoCalchera_TriggerTimer.Exps = {
        Time(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            return timer ? Math.max(timer.time, 0) : 0;
        },

        Duration(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            return timer ? timer.duration : 0;
        },

        Progress(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            const duration = timer ? timer.duration : 0;
            const time = timer ? timer.time : 0;
            let temp = Math.max(0, Math.min((duration - time) / duration, 1));
            temp = temp || 0;
            return temp
        },

        TotalTime(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            return timer ? timer.totalTime : 0;
        },
        
        Tag()
        {
            return this._lastTimerTag
        }
    };
}