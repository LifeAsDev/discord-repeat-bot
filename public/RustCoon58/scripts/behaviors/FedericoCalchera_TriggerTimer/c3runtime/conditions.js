"use strict";
{
    globalThis.C3.Behaviors.FedericoCalchera_TriggerTimer.Cnds = {
        Ontimer(tag)
        {
            return tag.toLowerCase() === this._lastTimerTag;
        },

        Onanytimer()
        {
            return true
        },

        Istimerrunning(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            if (typeof timer != "undefined" && timer.time > 0 && !timer.isPaused) return true;
        },

        Istimerpaused(tag)
        {
            const timer = this._timers.get(tag.toLowerCase());
            if (typeof timer != "undefined") return timer.isPaused;
        }
    };
}