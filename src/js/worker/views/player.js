// @flow

import { PLAYER, g, helpers } from "../../common";
import { freeAgents, trade } from "../core";
import { idb } from "../db";
import type { UpdateEvents } from "../../common/types";

async function updatePlayer(
    inputs: { pid: number },
    updateEvents: UpdateEvents,
    state: any,
): void | { [key: string]: any } {
    if (
        updateEvents.includes("firstRun") ||
        !state.retired ||
        state.pid !== inputs.pid
    ) {
        let p = await idb.getCopy.players({ pid: inputs.pid });
        if (p === undefined) {
            throw new Error("Invalid player ID");
        }
        p = await idb.getCopy.playersPlus(p, {
            attrs: [
                "pid",
                "name",
                "tid",
                "abbrev",
                "teamRegion",
                "teamName",
                "age",
                "hgtFt",
                "hgtIn",
                "weight",
                "born",
                "diedYear",
                "contract",
                "draft",
                "face",
                "mood",
                "injury",
                "salaries",
                "salariesTotal",
                "awardsGrouped",
                "freeAgentMood",
                "imgURL",
                "watch",
                "gamesUntilTradable",
                "college",
            ],
            ratings: [
                "season",
                "abbrev",
                "age",
                "ovr",
                "pot",
                "hgt",
                "stre",
                "spd",
                "jmp",
                "endu",
                "ins",
                "dnk",
                "ft",
                "fg",
                "tp",
                "blk",
                "stl",
                "drb",
                "pss",
                "reb",
                "skills",
                "pos",
            ],
            stats: [
                "psid",
                "season",
                "tid",
                "abbrev",
                "age",
                "gp",
                "gs",
                "min",
                "fg",
                "fga",
                "fgp",
                "fgAtRim",
                "fgaAtRim",
                "fgpAtRim",
                "fgLowPost",
                "fgaLowPost",
                "fgpLowPost",
                "fgMidRange",
                "fgaMidRange",
                "fgpMidRange",
                "tp",
                "tpa",
                "tpp",
                "ft",
                "fta",
                "ftp",
                "pm",
                "orb",
                "drb",
                "trb",
                "ast",
                "tov",
                "stl",
                "blk",
                "ba",
                "pf",
                "pts",
                "per",
                "ewa",
                "tsp",
                "tpar",
                "ftr",
                "tovp",
            ],
            playoffs: true,
            showRookies: true,
            fuzz: true,
        });
        if (p === undefined) {
            throw new Error("Invalid player ID");
        }

        // Account for extra free agent demands
        if (p.tid === PLAYER.FREE_AGENT) {
            p.contract.amount = freeAgents.amountWithMood(
                p.contract.amount,
                p.freeAgentMood[g.userTid],
            );
        }

        let events = await idb.getCopies.events({ pid: inputs.pid });

        const feats = events
            .filter(event => event.type === "playerFeat")
            .map(event => {
                return {
                    eid: event.eid,
                    season: event.season,
                    text: event.text,
                };
            });

        events = events
            .filter(event => {
                return !(
                    event.type === "award" ||
                    event.type === "injured" ||
                    event.type === "healed" ||
                    event.type === "hallOfFame" ||
                    event.type === "playerFeat" ||
                    event.type === "tragedy"
                );
            })
            .map(event => {
                return {
                    eid: event.eid,
                    season: event.season,
                    text: event.text,
                };
            });

        // Add untradable property
        p = trade.filterUntradable([p])[0];
        events.forEach(helpers.correctLinkLid);
        feats.forEach(helpers.correctLinkLid);

        return {
            player: p,
            showTradeFor: p.tid !== g.userTid && p.tid >= 0,
            freeAgent: p.tid === PLAYER.FREE_AGENT,
            retired: p.tid === PLAYER.RETIRED,
            showContract:
                p.tid !== PLAYER.UNDRAFTED &&
                p.tid !== PLAYER.UNDRAFTED_2 &&
                p.tid !== PLAYER.UNDRAFTED_3 &&
                p.tid !== PLAYER.UNDRAFTED_FANTASY_TEMP &&
                p.tid !== PLAYER.RETIRED,
            injured: p.injury.type !== "Healthy",
            godMode: g.godMode,
            events,
            feats,
        };
    }
}

export default {
    runBefore: [updatePlayer],
};
