"use strict";
{
    globalThis.C3.Behaviors.FedericoCalchera_TriggerTimer.Acts = {
        Starttimer(length, tag, type, deltatimetype)
        {
            this._timers.set(tag.toLowerCase(), new C3.Behaviors.FedericoCalchera_TriggerTimer.timer(length, !(type === 0), !(deltatimetype === 0)));
            this._setTicking(true);
        },

        Stoptimer(tag)
        {
            this._timers.delete(tag.toLowerCase())
        },

        Pauseresumetimer(tag, pauseresume)
        {
            const timer = this._timers.get(tag.toLowerCase());
            if (timer) timer.isPaused = pauseresume === 0;
        },

        Stopalltimers()
        {
            this._timers.clear();
            this._setTicking(false);
        },

        Pausealltimer(pauseresume)
        {
            for (const timer of this._timers.values())
            {
                timer.isPaused = pauseresume === 0
            }

        }
    };
}