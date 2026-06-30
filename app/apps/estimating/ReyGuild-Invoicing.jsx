import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";

const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKwAAADwCAMAAACqo39mAAAA/1BMVEUAAAABGS7Qkgj39vG7hAjp1aDXsFX9/Pi3fAKcoKVWXmopNUfTrVi5dCHwr2LoxXDSr17t3aP49XeurF3+/QHo1Zu4tS45RFN9fQRweIXNnjD8fgLn0pV6g41/f3//AAD/f3/8uTDtsqK0usXhxnH58M3DfQK7wsm4kCjhxHDNnze4kS5/BAS7m0vJu5+4mEmvrqenl2bZvYSxY2N6gn5qtP+qutO3x5aq4v8AAP8A/wAA//+q/1X/AP/av4X/qv8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADL56i6AAAAQHRSTlMA//7//P71C/3///+gAw37Yh0FBgFXBv8C/64Cnf8CAQIDEf9fVv7/qKFlaQJr/6sF8E4D/wMLEAYBAQEDAYQDn6mlugAAFkpJREFUeNrVXYd6ozyzVkBIpppi3GLHJb3u7vfX0+//ro4qSCAwYJz16tmaxPbLaPqMRgCMvjIQI/LHH7GOS4ysGKR/BNgMBJZlJX8E2hTkBKsV4Ox/rh4rviNMQFc+u362nYMHhtUKrl/GZjNsiZVfPdfOd68SLMIz/KcQ1rLSKydtJDmWce0svG4uwEEJ1sK72TVzAVC4wCJmLLpqLkhVsAG4Zj6I0lcV7Etye7W2iyLTwZIvLK9SfR3J7ySZqmDR45E5Nle39gBvLMMKErC8Oh4Awn+prxwk1+YXYsey/hC0EUgasRLX9u6qjMMBxM1gLQyuzJKhFrBXJl93IGij7DcQNuvu4c3AzzzJp3WcKE+SYw8uSI+D4S6jXa+fr8F96KlUwsHaKKcaJ2qkir65u2SffICKXXjFH2maaga3JXpIP8ib5gPBvlrrB9xkLo8H4r1GNe/gVWfWjyq0sNH+7gjUJLDQIM2BWYSy3mAQGohB2AOTL1e8qgTkqM2fxXP2qp1RU4M0YIwzyJeI+KaiHNQfNgWPAUJBXrX7/60ZXYN+/V/yqtgYwf8MzgrgI6E8A7w8zmY61gQJAUorn6kYh2p4O/sQQQ8xaRq9U8xeB2nW6XYw2FzICQ+vyu/cSgISsmf6S+LmQEEoYzgh/JFpDABYnAmh9TncoYykqn/FlNX25adGJaCoObrVwWLwWH5HZXby5glkWOEZ5iNbSvcEWSjG4K4Q6YJ+a7LzHSmblIoNFmAJDXKEfsEJJOu8oC1SrSgirFtzW9bkP01g11WweRnvCLD/mRE2hhOyICPsOY767TIxBavH8mMDHewBvGkCNjPH6eS5pUBuLIqTYT2HYzmlVC2fCFW02xe5DB0PUcnaVgBsIjtEGyYDjKHWFmUAQlwCFt+dlW/a4USz9PMiiOGg/qlr0lmKdc8gNXEVyhWD9sIpS5auI4Z51YEan2TFljJbVdEF5Fn+0kME/dOzOdUixCZmKtgnAXYCzs0yJDhXtvWuUOazObMYiUaMdKlHjehRj75SAo3atfIJlyDgioCwQaArlkFcW3KhVtOIkoDRLjUrJ4EWqFzLjQx6TBM1KHYE2uqTDSJtEQoibVNviWjQPS0fACfgsRrcbHDpBRGjgIh6gsfSuhDO2D8SpqWWdoy0PpGZaSH5JZmIQpB8HO5TnKZ7AtqQOkjALvtJvjW7W5JvwycCK06V7c7AJ2VYOFItqtTlDwpTHYqv5iVlTUHjhj5gSNUqp6tu2H4S3ctMwlgZx1QqBFSKRhqWOiqIMF3p1BwtEjuN6ZMEjK7Us/pLMidOdkQimCaw8l0yDljJtdMczA4p+QxCBDWaRWQ1x7bQQu/IgsL80/8Sfz7KwB3hUWpsmeIarVqSlkmBGPDoAL9aPdfkCRbrl2AdnAvrNYGj1aGi0hUgUVlCPmOD+mKF2rKC/BEcY/Iu1IMhYH+Mlxi9Bda5Swc7Ye4rFEjJf7PdaDnyTHWpxwBLMXItwMDCFzxeDpcwPxoXK5T+AAebjZlwTluThAOwTiaCrpy0FV/yTNLi80hbxyrgTrgLg0ctQUWtWcLOaCWX6guO3PVxt8MjiNjECBb+GLu2d3uuiFG0E+OCOT6OCzaa5editcxgrRc8ByOvkPuv5/JBHTAx4aODjXYntRcK3t7iDVnxnKzoIY7jz/d3nsPi/oGBthDi8Sums9m/mzC+vT08JG0fiJP8gaDmXlcV7PslSudaSoA7NcFrXMZTt7fL8HCYh2EUhUuysojSNyT/Lsx+ksWfP6QlKPXWBUrRmVaXC+JcfsZteIiifVtGbbYnyMOlJHP2+YMxK4P8A1+iJ6FwENZxzDc9XEbRso863y+zUECLNogLXHSZqjlrL6P+LAM6jwZmJ/Hd7XLJkvxRjOAvPa88Im3/L+HbPt+fzWZLXpZILsKxRVR7GMmME8qmc3DJhU8BmKVUAfA1n2fZEbe+XMlHXXzhdB4mAmUUhkaxDg9EmcnI9SP8TZ0HOOX6M00PYUHZf+XUbr29BdSYxXn+KIn5EWZ3nNPD/XcDxXMWkCcPrzn/fxrHgcF5QNZ6HcTSvjlEOzO84d3uu6DycjCOAqp3p4/JQ4BOuw1EOW+Yk/DGszrhdzRVMhHGSXyOD/YeU9ZdhhduQ8jo7ifx2Y64hRje+YX5N4mtcRZcxxdVDXcgbo0b0dRh68t13S/6j+m0MWPH8onB5Vqtj82NZgyl6249b+H7/g1b/sLzVgI1shQfXOtIuFRrJXHpTeRklPQWN42LoGaYp/VHXYOLmdxqHEa33V15/k2nRcj8VQUcXBKslkJ23K44SyJ7rqPCfbtcO3Copbym3s2Q5aIntTHlYpTNNLDIHQRWo2x+ua7wvd4eOQysrXcpXsz3nqWR+knO2WDXl+uonEW6onX8AVg9tc+W1m3uLsSxQG/pPhvsk+UQLvjb+AFM9gFwxS0YpA5cp+I7YlrMrgdoveozt5p7TDMRcc1yeYMoW6oDXsKLq7ShJrgH2iX94Qwr2PW+PeoMuMPULIHrErxwIhKLrLMDq7wQMsp2RpuAfEq3RzaZREDPc6HhSAu8ehcFBnPufu0o1ABtcNYR7YxXFGMMmANHfmv1bkJU/+bc5RPyqonmIxNgQhZBl9eOpq1sh3ggmiVJ9ULt1NmeD1Vw75T2RYisONnJjCAuhLibbUvAY6GgEH0BnmoMcDPeonDVhhqApWRA2iNyGm2qK/51rtYSRoVK11bhXbQBip6gPTM/T+rX5rKM4y5uRl9E704Kampxz8kOH3xo7CRAjndziaXxgv6JOGxVCQewaYqy3JtLLbfpWM6P1rY0tQ2iwgLezeWWZ5uJC9sa/o4gQQ0ssLi56DIRl1q3vBHtXZNwXZAF5Fo5ejVSrn80eLx4j4MGLXBz+aW6jkpm5AdezszCpfpVX79k1Oxsb75j+TYSLPfLnQrSsl72yFyNeVPB+j55EbqwaOlop8yZ828cyQgE7Kc5WMd7XOXTxd/db8NK1hdPRFD+hbBouMYNljY5N2gZZTnCt+Hh776Tmv011vby1VuNUeK21B+Jx6sYsHN1K03HPdvacjsknHwZqzdLl0C7U12D4RprsXIZOJ6hpZqI/uk4HHG7FLhTpWe8NZOP1QBmmGwttvcUppoulF2gtOEATcl375vfeVEmQV7qx8ma3dkBGRfPZUCZ6qEJUZ0LSKBIeyWJKiX09U9S9ngyLZ4Wfldvwi4o0qlI3NqNi/jb0KJw25RBt+kIf5N80DdJ6EmkbUAlXhJ8Ids2UcMvDC9ssLQmXduLCXyXIrDYBndaDpoQ6t43MMKTSN6eIG0mCeus+kGlRJ3aPZZjUeL6LYwA/3k7A528b6cXVNSDqApcQlyvxV88wbVFg2R36RoKlaKFEzNaW1gwovdbUtszybFfXZ1mxgBTe+CyzGhL0kYdKhwdCeudB5UsBB3byLWQHx9ctnTF4V4c61K2Q/ZZy7Js2xQ3TE6NzSnEqxNhCVnRk+XY9tloXRPXQu38oClWWHcnLCNrMwfIOvOUlXXbpIyw7cKQV5owpzYHx8Z8d+do1mc6oAEmMlfMm9jWMhmHU9qrqMmdDhI8riRNdl/m8J0a/qcGBUfY3msyY7CJD+T8qtNegWvCyoFKr/XZdberlbdabV3pg9N0rAkuggauFR4CjMxxDZbnYk9aWpdsHTIg5UjcrSkcWDDvEUGT9iBfM4iYPFVvzHdFqeAC+wQXUDabmpG2hy2eaxu3xKgQtlOuvSrJud0OzI5ZFAldcIoLqLZRP28qkN6v/G5+BEQVh0b3v/wt8298IWL5PMqidCYmOBSeTTcuqGClRO2IVMJ1oKVSlb7c0x6HO2NCWINqPQ/jxzzfOB10ga/vo3BhetVEVmzfFapWoJIvLJT4BsVRlCTyvHZaUYtOu3pVtCtixva+b/hD9R7iTlcd6hQJrHpJWp7xfeue39SwcqhDamIU7ZTWEupUpRzimzoTqMollH3vnuNWsDqDoTJOIE9K/C17VQuMFLfG1bcc0uJNpauwhWVL2ToLKlnPtgEq3ypjuoOBnRPxWndlWbfASjOh9v0Z6aUFeZNtjaoE63NTHwU/mlppLGvWsluC0RFknTJmOyPP6LpaYMTVlKPbBr/CtO+gOsKsUb5oScXhppz8PV42fFu4P07VjlXVAfG1urVnLKS+oWR9Hi1365WeWg1rVcLWGETd5EsoAmYSViNCtSWgOtZq8RFhraSIGsuzLseKJk2JiSFQn0uoZhL4rgZXBdvS9eARmA7XXGPVmWQaR2L1mpooih+Cx6IXsq2VhHgEhKTMpI9VD5HaSnilLe/rFXn7IgWDvlp1OHk/zRSOIFdWN6z0h4vujvXpPkhqHR1K2/txoC7uFWZlZmvRBasVldYWNSkC6hYyrNvROECT8nasK1sxYYq1bXC7KRNMG0WgvxOjcYB1Qr2o9XINLNEHnlETqOLq+WNp1g5YVU0Lib1dn6qAU0I8FVhdM4H9zupKt0rIlOnSwhLl2O57dQinW7fdgq4+N2Su+W3dARxAsbpd6nfi1C6qgK3rBG5hF8UmNkQQbRQyqivGdu3PqIKls8cCgKO4jbKukvClWBdm79Q6aYZZEF7xQ07sR1kZpSW8IBedkagJrM+yfCXWVQNWxn1eL7KeNt0CLKHpy+eR9cXsMnZoSs4M/arSAyIF631TFNluhxZVHdAJawGW03SegSLPgY1RDfE2hS3wZPLBSFfx8duWGkkN60m9Leu4GIShWsrPMpH0tqspOPH8xPk2enEK1gZimTigE1bySsbk62xea5MygbULVUWIYxJ4DasRrZGs3dw34RWsqwnlvayGaw6CW2ikZxuZaFHBWlfyKxNZn1A3V1OEt/Xst6wnaP0brvxompE1ENarYq24UL6ZrF2jDeEX1E8LyRNJuncgQgeW7zHl0tt32Myt7SbWAPbdQNm3Bs/Ll9FiQw7cgHZVJvNNWJ+75m2mDUebZL+cKW/A0/JGtXRvQsvEzDNyQK8oTrxBfTKSLNgZAoaF6h50RWvmVpqN6x5xinc4gur5m59FddGMp5HPgAnU1Mytk15YC5uw/I+mWk1NUBc8Fek2R5MmgTeyAOwVbjSpWeU0ZS1YcLmbsmqt3nSbetMvkhfKYA0+DGCRsQOVExbZ3s2ZaGHfrMOz03jOUUzKrqkDrp2mrWqc1cdPYe2deOIkgJGh6SATKbpqtY8bKaf9gzrQtrMpqMgX/K9b02lKbMojik73E2BPooXdTUHF53ox1cVncqhNxeDaVhewJ9DCAQk9l3dzmM8Ry+HMOtPaEuyiSwNC40mXAclHIQe5YejIsZx5aRtCd3RSkP26B1ac/RuS1pcmYQNqw4DC8niTpRLRkz3up9PdNd/W4nNGn+CgROlWvhs9RHfU4gR1KK+qaVdyczvsY8W7ZeO5oFCv/XNOz6W9zrF2DlA7pTq1a/LV4htU0D6pVIX0XNfABLQqAnSWrGCFu1mlYqNIfgHW6RY02VDn18E1CE/nqeBnahpboDvg98VrOslzyQn8lOqktykwcAF7Ozl+6la/L03jg2clKeD3QsvUQH9TUOgWXRGW8wgP1WJziaukLOqmKleKlMHhtR23olnKAwtR9RR4maVVXtTRF12xpgfmap9Rh6oeZyt7kGbgWHU6TE/Ykf22tsOO055B16p4EZurTO2u1vGVaBopvojbcQsdyCKYJrN1eofuK0GRemQ4rc4ZLkRMzZT3Qttstjy3Q/qw4meoTX64dhdZYXJVq9R5Y13bacLq3TdkTtvES++rD2v9HK7xdd3RmrF6/HRNH+vFdIF2H0ZUreQX2muhx9ROR+NpLARveS/Q6vSjTiqNBmH7qeuCtBULiuyBMs6P3di2fbq1pkrYTeVUWH2sqCRt7QSvM8Az4UiRY3dprHDt0l4zS1g9bpfVRKwg7bNdD/16wRVI0ReRLL+/pYVBLbw1kNYruBYa4HabdMGAsoNKnR9Rrdayxu+kdo/2QapaFAQVXevWCljdumXlcTsEedPhtpfxogkoduoSGYa+Yvy5yY8sOHMqZsyUhYWyI9rd0ulnyi4uPM9175U2YA61a3ud3MeEFbyyOMgbD4iCHZ3LUvUQTJErHR6Lmo/U8FN1hUh27gSU7QWfJ8bVhx+37LK84nan0vkyxtlkd5/4hjnq0ofgQeT0aloUHwRxuCNuQJbN59mpE2zrCiPcmPOt6rRxCBuSRr36K4V0wXnn64GK43ZKyOC2JTFgw1enPaFS6RI5o+7DibPiWJirVbRg85h80wQH2+7ZXOfb4vx9Mus+L7EcKljpHEZd6cpVW9+mVcZr5MH73WdVOLhaAtTjWnPyBGvXD2hpGKGEBwdesOd9VuX5wPuaN0qU52RiwEov9pCnQLxBreDM+MCWSRwN8znm2Jwv4OcInC92bY5y4QQ9Y82V7v12YE+VXZxU6jvgMyvuJatZdHlsnR/6ctTzXu52ePOXxPoyYFZiecWSKaj1va00qWIYwNY7b8SAK/xmeFwOmJE3Z/ekMWt5c/n1d+ktDbvZbnZbHL98vjhWr8Q6bCJteRHQxSfJeNwa0BuuooEzKMv7Ku3LopVRKUTNA0NOgl3m1neg9QtDvhk+llhprr0kWiXrA/F84K1LoXYF5MXQajHe0DsDcaTfVHghtB7DWsB93EXDlEFc7X25ANaVpKtwMH7o17x2Hj1auwLSsUefMVZGzrxoRg8jDJCxg+HiKsceeWyT2qYKOeI13g+xtoGptj3qEEfbphn98l4+cfFhf98A741TB0ckLss5qzediXzB3SCmxaa5g9ORiCv6vrQbD8n6Nxg2lzgF2DRUbxziukILsJKpvJiNDVEeeh2BkbZPlHP988k6KSqRxe2MAT7jfiBcOTUIpT4876RVwQEF2AkroMfgrLHf6UFDW0SxT2j4YSu/4AALatL1IMf7Dl5zLYGPAgF3Mrg0T3s/RQWSpjWFXJG/8hGG6me3ZbGU8FSC2DXFkA7ptp8X/aEyM0B/URYlbz3h033JWx/A+WtWTM3OqdeIX6FaafL7OQIyp0MlfwPAB8gRI+0GjzRSH4cgWrNnD1NquEufAfaqz1K5KnM3GzqQmarHgA71xeNdBkLoSe/y4fcqkag+klifJp2pS0cPEXoKHqWTufdcPYI4eARjTv+nVqWYTkdbgeKiC6YbXKWrfjJhw5zlIG9+AdOoNxXgQ6S1Ago+5mRCp+CWneosuR8TYVJ2PTxc5KY4VUeAxwB2K+qyMVmwvAtIDDv/zkWU4r/elYKV0zDvgikrcc8xHY1Op/yDb18/iaTlQXnVphFueQqMsfgn0Ab0f+eaEepm79xqSmbwalCfCn+FMsA8Bb9r0fNESaD55gV1+YAbKPP4jKoh+K2L3img3GxVMgOFOuFBC+HYdUx/dAZ+96JWAscvcmr7E9O7K1ay5a41VVa/n6plOoT8UdziDmnjEaEqlEELvYlidiVQOXU/RMWXKagnpvyl+389VK0myouYugAb/y5l1QY2DdRSkyTtBP4FsmvDShB9Mn0LRVQ14WgnE3CFKwMxnCh1PCjB/uMKwaa0w70oNU64A0l+/cD4CtHOAMbJQ/weBJDeEvzyErx/xkcCdTxT8P+EOHUesP1EDwAAAABJRU5ErkJggg==";

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE OPS — Estimating & Invoicing  (starter shell)
//
// Same look, same logo as the outreach app — different job. This one is for
// building estimates from a master price list, turning them into invoices,
// and keeping the team's clients in one place.
//
// Who can do what (hierarchy: Owner ▸ Admin ▸ Estimator):
//   • Estimator — builds estimates & invoices, sees the price list + SOPs,
//                 sees the client list. Sees ONLY their own work. Cannot see
//                 cost/margin (the "numbers"), can't edit the price list,
//                 can't approve anything.
//   • Admin     — runs the estimators. Sees every estimate/invoice, the cost &
//                 margin numbers, edits the price list & SOPs, approves work.
//   • Owner     — everything Admin can do, plus adds people and sets roles.
//
// Data persists across sessions via window.storage (one key per collection).
// Everything here is meant to be edited — prices, SOP text, statuses, tax, etc.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE = {
  people: "so_people",
  clients: "so_clients",
  price: "so_pricelist",
  estimates: "so_estimates",
  invoices: "so_invoices",
  sops: "so_sops",
  suppliers: "so_suppliers",
  profile: "so_profile",
  notifications: "so_notifications",
  payouts: "so_payouts",
  settings: "so_settings",
  audit: "so_audit",
  messages: "so_messages",
  msgSeen: "so_msgseen",
};

const ROLES = ["Owner", "Admin", "Estimator"];
const ROLE_COLOR = { Owner: "var(--amber-deep)", Admin: "var(--blue)", Estimator: "var(--ink-2)" };

const TAX_RATE = 0.0;        // edit: sales tax applied to estimate / invoice totals (e.g. 0.0825)
const TAX_LABEL = "Tax";     // edit: what to call it on the line

const EST_STATUSES = ["Draft", "Submitted", "Approved", "Declined"];
const INV_STATUSES = ["Draft", "Sent", "Paid"];
const EST_COLOR = { Draft: "var(--ink-2)", Submitted: "var(--blue)", Approved: "var(--green)", Declined: "var(--red)" };
const INV_COLOR = { Draft: "var(--ink-2)", Sent: "var(--blue)", Paid: "var(--green)" };

// ── Follow-up cadence for estimates sent to a client ─────────────────────────
// Days are counted from when an estimate is marked "Sent to client".
// kind "email" = a one-click, pre-filled reminder to the client.
// kind "call"  = the estimator who owns the estimate is told to phone them.
// Edit the days/kinds/labels freely.
const FOLLOWUP_STEPS = [
  { kind: "call",  afterDays: 3,  label: "Call the client" },          // rep notification
  { kind: "email", afterDays: 8,  label: "Follow-up 1 (email)", auto: true },  // auto-send (with backend)
  { kind: "email", afterDays: 13, label: "Follow-up 2 (email)", auto: true },  // auto-send (with backend)
  { kind: "call",  afterDays: 18, label: "Call the client" },          // rep notification
];
const DAY = 86400000;
const OVERDUE_GRACE_DAYS = 5;     // days after the due date before the past-due email is offered

// ── Link to the Client Outreach app (royalties) ──────────────────────────────
// Both apps share window.storage, so we can read who walked each address in the
// outreach app and feed qualifying invoices back into its commission engine.
const OUTREACH_VISITS_KEY = "crm_visits";       // outreach app's logged walk-ins
const OUTREACH_INVOICES_KEY = "crm_invoices";   // outreach app's commission feed
const ROYALTY_RATE = 0.10;        // 10% to the rep who first walked the address
const ROYALTY_VEST_DAYS = 30;     // an invoice becomes payable this many days after its date
const DEFAULT_PAYOUT = 50;        // flat $ paid to the estimator per invoice — editable by the owner/admin in Settings
const PLAN = { name: "ReyGuild Pro", cycleDays: 30 };

// ── Seed data — replace with your real numbers in the Price List / SOP tabs ──
const SEED_PRICE = [
  { id: "p1", category: "Labor", name: "Standard labor (per hour)", unit: "hr", price: 95, cost: 45 },
  { id: "p2", category: "Labor", name: "After-hours / emergency labor", unit: "hr", price: 145, cost: 70 },
  { id: "p3", category: "Service", name: "Service call / trip charge", unit: "ea", price: 89, cost: 25 },
  { id: "p4", category: "Service", name: "Diagnostic / inspection", unit: "ea", price: 125, cost: 40 },
  { id: "p5", category: "Materials", name: "Materials markup", unit: "ea", price: 0, cost: 0 },
];

const SEED_SOPS = [
  {
    id: "s1",
    title: "1 · Arrive ready & greet well",
    body:
`Set yourself up to look sharp before you ever knock.
• Review tomorrow's schedule the day before, and again that morning — job type, location, notes, and any materials you'll need.
• Plan your route and arrival time so you're early, never rushed.
• Pack your kit: tape measure, pen and pad, flashlight, ladder, and shoe covers.
• Check for posted arrival notes (for example, "please don't ring the bell") and honor them.
• Greet the customer warmly — polite, professional, and positive from the first word to the last.
• Ask them to walk you through the job in their own words, and let them talk.`,
  },
  {
    id: "s2",
    title: "2 · Walk the job & capture the details",
    body:
`Understand the work fully before you ever think about price.
• Confirm exactly what they want done and where.
• Note the timeline: when the issue started, when you could start, and when it needs to be finished.
• Get the specs for any equipment or appliance involved, and write them down.
• Then let the customer know you'll take measurements and photos and will check back in when you're done. Stepping away to work uninterrupted is normal and professional.`,
  },
  {
    id: "s3",
    title: "3 · Assess the space on your own",
    body:
`• Inspect the existing system or setup — its type, capacity, condition, and where the new work will tie in. Confirm there's room to do it right, or make a plan if there isn't.
• Map the cleanest route from the source to the work area. Look for attic, crawlspace, or exterior paths, and avoid surface or wall damage wherever you can.
• Photograph the source, the route, any obstacles, and the work location. Pictures beat memory every time.
• If any wall or surface damage is unavoidable, note it now and estimate how much.`,
  },
  {
    id: "s4",
    title: "4 · Measure, count & rate the work",
    body:
`• Measure the full run — up and down walls, into the ground and back out. Add a margin to every run so you're never short.
• Count every fixture, part, and material you'll need.
• Rate the difficulty honestly, and note anything special: rental equipment, an oversized ladder, or tight access.
• Estimate your labor hours based on that difficulty.`,
  },
  {
    id: "s5",
    title: "5 · Oversized or complex jobs",
    body:
`Some jobs are too big to price on the spot — and that's fine.
• Gather your full material list, photos, and measurements, and document exactly what the customer wants.
• Clean up, then tell them: "This one needs a little more research before I can give you an accurate estimate. I'll have it to you by email within 24 hours."
• Leave courteously — then deliver on that promise.`,
  },
  {
    id: "s6",
    title: "6 · Price in private & write the estimate",
    body:
`• Clean up and pack your tools before you touch any numbers.
• Build the estimate away from the customer — in your vehicle, not on their doorstep. Never price in front of them.
• Price it from your price list; the app does the math for you.
• Write a clean, plain-language description of the work.
• If surface damage may be needed, add a note that repairs aren't included, but you're glad to handle them if they'd prefer.`,
  },
  {
    id: "s7",
    title: "7 · What every estimate includes",
    body:
`Before you send it, make sure the estimate has:
• The client's name and address, spelled correctly.
• A job title — the address plus a 2–3 word description of the work.
• The job description, with the price beside it.
• The one-year warranty (labor and material included).
• The service agreement.
• A thank-you line — "Thank you for the opportunity to earn your business" for a new customer, or "It's a pleasure doing business with you, and we value our continued relationship" for a returning one.
• "Estimate valid for 90 days" — but only add this if the customer asks you to hold off, never before.`,
  },
  {
    id: "s8",
    title: "8 · Present it & secure the job",
    body:
`• Confirm the scope and give a brief, plain explanation of the work — no deep technical detail.
• Show them the price, and mention the one-year warranty.
• Walk them through the agreement simply: "Standard contract — the main thing to know is the payment terms, and that final payment is due within 15 days of completion."
• Show them where to sign: "If everything looks good, this is where you sign and we can get to work."
• If they sign, schedule them right then and fit their calendar. If a down payment applies, let them know the office will reach out.
• If they're not ready, mention estimates are valid for 90 days — and then add that line to the estimate.
• Thank them warmly and head out.`,
  },
  {
    id: "s9",
    title: "9 · Follow up & finish strong",
    body:
`Follow up within 24–72 hours — every time, no exceptions. Set a reminder so it never slips.

Before you leave a site, re-walk it (on foot or in your head) and confirm:
• Every photo is taken.
• Every measurement is noted correctly.
• The system's type and available capacity are recorded.
• All material is accounted for.

Core principles:
• Clarity over speed.
• Pictures over memory.
• Confirm everything.
• Price in private.
• Sell the outcome, not the line items.`,
  },
  {
    id: "s10",
    title: "Using the app · estimate → invoice",
    body:
`1. Build the estimate — line items pull from the Price List and the warranty + contract attach automatically (uncheck the box on an estimate to leave them off).
2. Tap Preview to see exactly what the client gets, then Email to client. If there's no email on file, it asks for one.
3. Get the client's sign-off: on the estimate they can Accept & sign, choose "Let me think on it," or Decline.
4. Once Approved, hit "→ Invoice" — it copies the client and every line item. Add your invoice number, mark it Sent, and the office records payments.`,
  },
  {
    id: "s11",
    title: "Set up your work email (Gmail)",
    body:
`Use a separate email for work so client messages never mix with your personal inbox.
1. On a browser, go to gmail.com and tap "Create account." Pick something clean and professional — your name works great.
2. Write the new address and password down somewhere safe.
3. Give the new address to your administrator so they can link it to your profile in the app.
4. That's it. When the app emails a client for you, it can be set to come from a company "no-reply" address, and any reply the client sends lands right back in your new Gmail. You don't have to configure anything else — the office sets up the rest.`,
  },
  {
    id: "s12",
    title: "Finding your way around the app",
    body:
`• Your work lives across the top: Estimates, Invoices, Follow-ups, Clients, and the Price List.
• Estimates are grouped into Pending, Approved, and Declined — tap the buttons to filter.
• Follow-ups shows what's due; tap an item to log what happened and clear it.
• Need help, your SOPs, or to switch dark/light mode? It's all under Settings. Open Settings and you'll see Help, SOPs, and Preferences.
• Help has a search bar — type a couple of words. If it can't answer it, there's a support email link at the bottom.`,
  },
  {
    id: "a1", role: "admin",
    title: "Administrator · your daily routine",
    body:
`You can see everyone's work — use it to keep the team moving, not to micromanage.
• Check the Approvals tab every day. It holds payouts to approve, follow-ups running late, past-due invoices, collections calls, estimate approvals, and copies of everything sent.
• Skim the team's Follow-ups and Estimates so you know what's in flight.
• Keep the Price List current (the Warranty and Contract editors live under Price List), and keep the follow-up emails sharp (they're under Follow-ups). Your Business letterhead and Subscription are in Settings → Account.`,
  },
  {
    id: "a2", role: "admin",
    title: "Administrator · approving payouts",
    body:
`Each invoice an estimator sends earns them a payout, but it's yours to approve.
• Approve or deny each one on the Approvals tab. (Set the amount in Settings → Preferences, or give someone a custom rate on the Team tab.)
• Watch for splits: several payouts for the same address on the same day usually mean one job broken into multiple invoices. The app flags these in red — approve only one per real job.
• Do this daily so estimators are paid promptly.`,
  },
  {
    id: "a3", role: "admin",
    title: "Administrator · late follow-ups & collections",
    body:
`The Approvals tab watches the whole sequence for you.
• If a follow-up runs more than three days late, email the estimator straight from the flag, or dismiss it with a reason.
• Past-due invoices: five days after the due date the past-due email is ready to send. Seven days after that, if it's still unpaid, it escalates to a "call the client" item and a banner.
• The goal: no client is ever left without a follow-up, and no invoice slips through.`,
  },
  {
    id: "a4", role: "admin",
    title: "Administrator · logging payments",
    body:
`Record every payment as it comes in.
• On the invoice, hit "Record payment" — enter the amount, the method (card, online deposit, check, cash, or other), and the date.
• Partial payments are fine — the app tracks the balance. When it hits zero the invoice is marked Paid; then Archive it to move it to the Done folder.
• A thank-you / review-request email is ready three days after an invoice is sent — set your review link in the email settings under Follow-ups.`,
  },
  {
    id: "a5", role: "admin",
    title: "Administrator · royalties & paying the team",
    body:
`Estimators don't see pay in the app — you hand them a printout, so there's no comparing.
• On the Royalties tab, set a custom From/To date range and export "Royalties owed" — that's each estimator's stub for the period. Print it or hand it over.
• Export "Paid-in-full addresses" for the same window and drop those into your outreach site to settle the address royalties.
• Approve each payout as the work checks out.`,
  },
  {
    id: "a6", role: "admin",
    title: "Administrator · team email setup",
    body:
`Get everyone's email squared away so the follow-up sequence can run.
1. Have each estimator create a dedicated work Gmail (their SOP walks them through it), then add that address to their profile on the Team tab.
2. Set up one company "no-reply" sending address for the business, and enter it under Follow-ups → your emails as the From address, with a real inbox as the Reply-to.
3. Replies from clients route back to the real inbox — simplest is to send from the company no-reply and let replies land in one monitored inbox, or route them to each estimator's Gmail.
4. Make sure every client has a phone number and email on file — the automatic sequence can't start without them.
Note: one-tap sending works today; fully automatic sending from the no-reply address switches on when the email service is connected.`,
  },
];

// ── Supply depots — quick links to check material prices not yet on the list ──
// Seeded with a few; Owner/Admin can add, edit, or remove any of them in-app.
const SEED_SUPPLIERS = [
  { id: "sup1", name: "Home Depot", url: "https://www.homedepot.com" },
  { id: "sup2", name: "Lowe's", url: "https://www.lowes.com" },
  { id: "sup3", name: "Rexel (electrical)", url: "https://www.rexelusa.com" },
];

// ── Help articles (searchable) ───────────────────────────────────────────────
const SUPPORT_EMAIL = "support@reyguild.com";
const HELP_ARTICLES = [
  { title: "Roles & “Acting as”", keywords: "role owner admin estimator permission acting as who login access",
    body: `There are three roles. The Owner (you, the creator) can do everything. An Admin can do everything the Owner can except manage people. An Estimator builds estimates and invoices and sees only their own work.\nUse the “Acting as” menu at the top to preview the app as any person on your team.` },
  { title: "Building an estimate", keywords: "estimate new build job description line items itemized one price lump quote",
    body: `Open the Estimates tab. Add a job description, then choose how to price it: Itemized (a priced-out sheet — add each item from your price list as a line) or One price + description (a single lump price). Your warranty and service agreement attach to the bottom automatically.` },
  { title: "Contacts (estimators)", keywords: "client contact estimator full name address exact match new add own private",
    body: `Estimators don't see the whole client list — they only see their own. On an estimate, type the contact's full name and full address. If both exactly match an existing contact, it pops up to reuse. If not, it's saved as a new contact when you save the estimate.` },
  { title: "Emailing an estimate or invoice", keywords: "email send client letterhead logo email me preview copy",
    body: `Tap Preview on any estimate or invoice to see exactly what the client gets, then Email to client to send it with your business letterhead on top. If no email is on file, it asks for one first.` },
  { title: "Business letterhead", keywords: "business profile logo company name address phone letterhead branding",
    body: `Under Settings → Account (admin only), upload your logo and enter your company name, address, phone, email, and website. This heading appears on every estimate and invoice you email — your branding only.` },
  { title: "Warranty & contract", keywords: "warranty contract agreement net 15 legal terms one year prefill",
    body: `The Warranty and Contract editors live under Price List (admin). They hold premade text that fills in your business name automatically; the contract uses Net 15 terms and covers third-party collection/legal fees. Both attach to every estimate — uncheck the box on an estimate to leave them off.` },
  { title: "Follow-up schedule", keywords: "follow up followup reminder cadence call email day 3 8 13 18 sent to client",
    body: `Mark an estimate “Sent to client” and the sequence starts: a call reminder on day 3, a Follow-up 1 email on day 8, a Follow-up 2 email on day 13, and a call reminder on day 18. Due items appear on the Follow-ups tab.` },
  { title: "Approving an estimate & e-signature", keywords: "approve approval sign signature client phone outcome still deciding lost notification",
    body: `On a follow-up call you record the outcome: Approved, Still deciding, or Went with someone else. Or have the client sign the estimate with the Client sign-off button. Either way, approval marks the estimate Approved and notifies the office.` },
  { title: "Estimate → invoice", keywords: "convert invoice approved create bill",
    body: `Once an estimate is Approved, hit “→ Invoice” on its card to copy the client and every line item into a new invoice. Add your invoice number and mark it Sent when it goes out.` },
  { title: "Recording payments", keywords: "payment paid cash check card online partial balance done archive owed",
    body: `On an invoice, hit “Record payment” and enter the amount, method (cash, check, card, or online), and date. Partial payments are tracked — the card shows the balance left. When it's paid in full the invoice is marked Paid; then Archive it to move it to the Done folder.` },
  { title: "Estimator payouts ($50 per invoice)", keywords: "payout commission 50 invoice approve pay my pay deny",
    body: `Each invoice an estimator sends creates a payout request that the admin approves on the Approvals tab. Estimators don't see pay in the app — the admin hands them a printed stub from the Royalties tab.` },
  { title: "Royalties", keywords: "royalty royalties outreach 10 percent vest commission address",
    body: `Invoices matched by job address to an outreach walk-in earn that estimator a royalty. The Royalties tab is admin/owner only; the admin exports a stub for each estimator over any date range and hands it to them.` },
  { title: "Admin Approvals tab", keywords: "approvals admin payout late follow up duplicate split oversight dismiss",
    body: `The Approvals tab (admin) is your daily checklist: payouts to approve (duplicates flagged in red), follow-ups running more than 3 days late (email the estimator or dismiss with a reason), and estimate approvals.` },
  { title: "SOPs", keywords: "sop procedure training steps walk job admin only audience",
    body: `Your step-by-step procedures live under Settings → SOPs. Estimators see the estimator SOPs; admins see those plus the admin SOPs (marked with a lock). When you add one, choose who can see it.` },
  { title: "Where to find things", keywords: "where find navigation menu tabs settings help sops account audit preferences lost",
    body: `Your work is across the top: Estimates, Invoices, Follow-ups, Clients, Price List. Everything else is under Settings. Open Settings and you'll find Help, SOPs, Preferences (dark/light), and — for admins/owner — Account (business info + subscription) and the Audit log. The Warranty and Contract editors live under Price List; the follow-up email editor lives under Follow-ups.` },
  { title: "Getting help & support email", keywords: "help support email search article question contact reyguild settings",
    body: `Open Settings → Help. There's a search bar — type a couple of words to find the right article. If it still doesn't answer your question, scroll to the bottom for a support form and a support email link.` },
  { title: "Set up your work email (Gmail)", keywords: "gmail email setup work account no-reply reply fake link outgoing estimator",
    body: `Create a separate Gmail for work so client mail doesn't mix with personal: go to gmail.com, tap Create account, and pick a clean name. Give that address to your administrator to link to your profile. The app can send to clients from a company no-reply address, and replies come back to your Gmail — the office handles that setup.` },
  { title: "Admin: team email setup", keywords: "admin email no-reply from reply-to assign estimator gmail outgoing company",
    body: `Add each estimator's work Gmail to their profile on the Team tab. Set one company no-reply From address and a real Reply-to inbox under Follow-ups → your emails. Clients' replies route back to the real inbox. Live automatic sending from the no-reply address activates when the email service is connected.` },
  { title: "Settings & dark mode", keywords: "settings dark light mode theme navy background appearance night preferences",
    body: `Open Settings → Preferences and switch between Light (warm paper) and Dark (navy background). Your choice is saved. Admins also set the estimator payout amount and notification copies here.` },
  { title: "Due dates & past-due reminders", keywords: "due date net 15 overdue past due collections call banner reminder late invoice",
    body: `Set a payment due date on each invoice (one-tap Net 15). If it's unpaid past that date, the invoice flags as past due and a reminder email is ready to send. Once sent, the office watches it; if it's still unpaid 7 days later it escalates to a "call the client" item and a red banner for the admin.` },
  { title: "Editing your emails", keywords: "email template edit placeholder from reply-to no-reply company follow-up review overdue",
    body: `Under Follow-ups (admin) you can reword the follow-up, review, and past-due emails. Don't change the words inside curly braces — placeholders like {first}, {client}, {total}, {company}, and {review_url} fill in automatically. You can also set the From address clients see and the reply-to address their replies land in.` },
  { title: "Setting estimator pay", keywords: "payout pay per invoice rate amount settings team estimator royalty 50 default",
    body: `Set the default per-invoice payout under Settings → Preferences (admin). To pay someone a different rate, open the Team tab and fill in that person's "Payout per invoice" — blank means they get the default.` },
  { title: "Copies of what's sent", keywords: "copy sent notification estimate invoice off toggle approvals owner admin overwhelm",
    body: `When the copies setting is on, a copy of every estimate and invoice that goes out appears on the admin's Approvals tab under "Sent — your copies." Turn it off anytime in Settings if it's too much.` },
];


// ── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Date.now() + "-" + Math.random().toString(36).slice(2, 7); }
function num(v) { const n = parseFloat((v ?? "").toString().replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
function money(n) { return "$" + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function toLocalDate(d) { const p = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d)) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function csvCell(v) { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function toCsv(rows) { return rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); }
function downloadTextFile(name, text, type) {
  try {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500); return true;
  } catch (e) { return false; }
}
function emptyLine() { return { id: uid(), name: "", qty: 1, unitPrice: "" }; }
function lineTotal(l) { return num(l.qty) * num(l.unitPrice); }
function subtotalOf(lines) { return (lines || []).reduce((s, l) => s + lineTotal(l), 0); }
function totalsOf(lines) {
  const sub = subtotalOf(lines);
  const tax = sub * TAX_RATE;
  return { sub, tax, total: sub + tax };
}
// mode-aware totals: an estimate/invoice is either itemized (line items) or a lump sum (one price)
function recSub(r) { return r && r.mode === "lumpsum" ? num(r.lumpPrice) : subtotalOf(r ? r.lines : []); }
function recTotals(r) { const sub = recSub(r); const tax = sub * TAX_RATE; return { sub, tax, total: sub + tax }; }

// follow-up scheduling — all derived from estimate.sentAt + how many steps are done
function fuSentTs(e) { if (!e.sentAt) return 0; const d = new Date(e.sentAt.length <= 10 ? e.sentAt + "T09:00:00" : e.sentAt); return isNaN(d) ? 0 : d.getTime(); }
function fuActive(e) { return !!e.sentAt && !e.fuStopped && e.status !== "Declined" && (e.fuDone || 0) < FOLLOWUP_STEPS.length; }
function fuSchedule(e) {
  const base = fuSentTs(e);
  return FOLLOWUP_STEPS.map((st, i) => {
    const dueTs = base ? base + st.afterDays * DAY : 0;
    const done = (e.fuDone || 0) > i;
    const isNext = (e.fuDone || 0) === i;
    return { ...st, idx: i, dueTs, done, due: base > 0 && isNext && Date.now() >= dueTs, overdueDays: dueTs ? Math.floor((Date.now() - dueTs) / DAY) : 0 };
  });
}
function fuNext(e) { return fuSchedule(e).find((s) => !s.done) || null; }
function fuDueStep(e) { if (!fuActive(e)) return null; const n = fuNext(e); return n && n.due ? n : null; }

// address matching — mirrors the outreach app so the same job links across both
function toTs(s) { if (!s) return 0; const d = new Date(s.length <= 10 ? s + "T12:00:00" : s); return isNaN(d) ? 0 : d.getTime(); }
function normAddr(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|court|ct|suite|ste|unit|apt|number|no)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function matchOutreachRep(address, visits) {
  const target = normAddr(address);
  if (!target) return "";
  const hits = (visits || [])
    .filter((v) => { const a = normAddr(v.address); return a && (a === target || a.includes(target) || target.includes(a)); })
    .sort((a, b) => toTs(a.visitDate) - toTs(b.visitDate));
  return hits.length ? (hits[0].rep || "").trim() : "";
}
function royaltyVestTs(i) { const t = toTs(i.date); return t ? t + ROYALTY_VEST_DAYS * DAY : 0; }
function isVested(i) { const v = royaltyVestTs(i); return v ? Date.now() >= v : false; }
function vestDaysLeft(i) { const v = royaltyVestTs(i); return v ? Math.max(0, Math.ceil((v - Date.now()) / DAY)) : null; }

// auto-guess which CSV column maps to which client field
function guessClientMap(fields) {
  const find = (re) => fields.find((f) => re.test(f.toLowerCase())) || "";
  return {
    company: find(/company|business|client|account|customer|organization|org\b/),
    contact: find(/contact|^name$|full ?name|attention|attn|poc/),
    phone: find(/phone|tel|mobile|cell/),
    email: find(/e-?mail/),
    address: find(/address|addr|street|location|city|state|zip/),
    notes: find(/note|comment|memo|description|desc/),
  };
}

const emptyPerson = () => ({ id: null, name: "", role: "Estimator", email: "", phone: "", payout: "" });
const emptyClient = () => ({ id: null, company: "", contact: "", phone: "", email: "", address: "", notes: "", owner: "" });
const emptyProfile = () => ({ name: "", tagline: "", address: "", phone: "", email: "", website: "", logo: "", warranty: "", contract: "", emailFollowup1: "", emailFollowup2: "", emailReview: "", emailOverdue: "", reviewUrl: "", fromEmail: "", replyTo: "" });
// {tokens} fill in automatically from the company info + the estimate
const DEFAULT_FOLLOWUP_1 =
`Hi {first},

Thank you again for the opportunity to provide an estimate {estimate_no} for {total}. We're checking in to see whether you'd still like to move forward with us, or if you've found another provider.

We'd be glad to answer any questions or make adjustments — just reply here and we'll take care of it.

Thanks,
{company}`;
const DEFAULT_FOLLOWUP_2 =
`Hi {first},

I wanted to follow up once more on the estimate {estimate_no} for {total} we put together for you. We'd genuinely welcome the opportunity to earn your business, and we're happy to walk through any details or adjust the scope to fit your needs.

If you've decided to go another direction, no problem at all — just let us know so we can close it out. Otherwise, we're ready whenever you are.

Thanks,
{company}`;
const DEFAULT_REVIEW =
`Hi {first},

Thank you for trusting {company} with your project — it was a pleasure working with you. If you have a moment, we'd be grateful if you'd leave us a quick review. It genuinely helps a small business like ours, and it means a lot.

Thank you again for your business. We're always here if you need us.

Warm regards,
{company}`;
const DEFAULT_OVERDUE =
`Hi {first},

This is a friendly reminder that invoice {invoice_no} for {balance} is now past its due date of {due_date}. We know these things slip by — we just wanted to make sure it didn't get missed.

If you've already sent payment, thank you and please disregard. Otherwise, we'd appreciate it whenever you get a chance, and we're glad to answer any questions.

Thank you,
{company}`;
// strict normalize: exact contact match needs full name + full address (not a loose guess)
const normExact = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

// premade legal text — prefilled with the business name from the Business tab
function defaultWarranty(co) {
  const C = co || "We";
  return `ONE-YEAR WORKMANSHIP WARRANTY\n\n${C} warrants all work we service for a period of one (1) year from the date of completion. During this period we will repair or correct any defect in our workmanship at no additional charge.\n\nThis warranty covers the labor and workmanship on services we performed. It does not cover damage from misuse, alteration or repair by others, normal wear and tear, or conditions beyond our control.`;
}
function defaultContract(co) {
  const C = co || "the Company";
  return `SERVICE AGREEMENT\n\nThis Agreement is between ${C} ("Company") and the client identified on this estimate ("Client").\n\n1. SCOPE. Company will perform the work described in this estimate.\n\n2. PAYMENT TERMS. Payment is due Net 15 days from the invoice date. Balances not paid within 15 days may accrue a late charge as permitted by law.\n\n3. COLLECTION & LEGAL COSTS. If any amount is not paid when due and the matter is referred to a third party for collection or legal action, Client agrees to pay all third-party costs of collection, including collection-agency fees, court costs, and reasonable attorney's fees.\n\n4. WARRANTY. Completed work is covered by Company's one (1) year workmanship warranty, provided separately.\n\n5. CHANGES. Any change to the scope of work must be agreed in writing and may adjust the price.\n\n6. ACCEPTANCE. Client's signature on, or written approval of, this estimate constitutes acceptance of these terms.\n\n${C}`;
}
const emptyPriceItem = () => ({ id: null, category: "", name: "", unit: "ea", price: "", cost: "" });
const emptySupplier = () => ({ id: null, name: "", url: "" });
const emptyEstimate = () => ({ id: null, estimateNo: "", date: toLocalDate(new Date()), client: "", clientAddr: "", jobDescription: "", status: "Draft", createdBy: "", mode: "itemized", lines: [emptyLine()], lumpDescription: "", lumpPrice: "", notes: "", sentAt: "", fuDone: 0, fuStopped: false, archived: false, invoiced: false, attachLegal: true, photos: [] });
const emptyInvoice = () => ({ id: null, invoiceNo: "", date: toLocalDate(new Date()), client: "", address: "", status: "Draft", createdBy: "", fromEstimate: "", mode: "itemized", lines: [emptyLine()], lumpDescription: "", lumpPrice: "", notes: "", pushedToOutreach: false, payments: [], archived: false, sentAt: "", reviewSent: false, dueDate: "", overdueEmailSent: false, overdueEmailSentAt: "", collectionDone: false, photos: [] });
const PAY_METHODS = ["Card", "Online deposit", "Check", "Cash", "Other"];
const NET_DAYS = 15;

export default function ReyGuild() {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("estimates");

  const [people, setPeople] = useState([]);
  const [clients, setClients] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sops, setSops] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierForm, setSupplierForm] = useState(emptySupplier());
  const [profile, setProfile] = useState(emptyProfile());
  const [profileForm, setProfileForm] = useState(emptyProfile());
  const [notifications, setNotifications] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [signFor, setSignFor] = useState(null);   // estimate id whose signature panel is open
  const [callDate, setCallDate] = useState({});    // per-estimate call date in the follow-up outcome buttons
  const [payFor, setPayFor] = useState(null);      // invoice id whose payment form is open
  const [payDraft, setPayDraft] = useState({ amount: "", method: "Card", methodOther: "", date: toLocalDate(new Date()) });
  const [lateReason, setLateReason] = useState({});// admin's dismiss reason per estimate
  const [theme, setTheme] = useState("light");
  const [payoutAmt, setPayoutAmt] = useState(DEFAULT_PAYOUT);
  const [payoutDraft, setPayoutDraft] = useState(String(DEFAULT_PAYOUT));
  const [notifySent, setNotifySent] = useState(true);
  const [account, setAccount] = useState({ status: "active", email: "", cardLast4: "", legalUrl: "", startedAt: "" });
  const [royaltyFrom, setRoyaltyFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return toLocalDate(d); });
  const [royaltyTo, setRoyaltyTo] = useState(() => toLocalDate(new Date()));
  const [audit, setAudit] = useState([]);
  const [auditQuery, setAuditQuery] = useState("");
  const [settingsSub, setSettingsSub] = useState("help");
  const [previewFor, setPreviewFor] = useState(null); // record id whose preview is open
  const [messages, setMessages] = useState([]);
  const [msgSeen, setMsgSeen] = useState({});
  const [msgDraft, setMsgDraft] = useState("");
  const [msgTarget, setMsgTarget] = useState("team");
  const [navOpen, setNavOpen] = useState(false);
  const [helpQuery, setHelpQuery] = useState("");
  const [supportForm, setSupportForm] = useState({ name: "", email: "", app: "ReyGuild — Estimating & Invoicing", message: "" });
  const [emailPromptFor, setEmailPromptFor] = useState(null); // record id needing a client email
  const [emailDraft, setEmailDraft] = useState("");
  const [outreachVisits, setOutreachVisits] = useState([]); // read-only, from the outreach app

  const [currentUserId, setCurrentUserId] = useState("");

  // forms
  const [estForm, setEstForm] = useState(emptyEstimate());
  const [invForm, setInvForm] = useState(emptyInvoice());
  const [clientForm, setClientForm] = useState(emptyClient());
  const [cliCsv, setCliCsv] = useState(null);
  const [cliMap, setCliMap] = useState({ company: "", contact: "", phone: "", email: "", address: "", notes: "" });
  const [cliCsvErr, setCliCsvErr] = useState("");
  const cliFileRef = useRef(null);
  const [priceForm, setPriceForm] = useState(emptyPriceItem());
  const [personForm, setPersonForm] = useState(emptyPerson());
  const [sopEditId, setSopEditId] = useState(null);
  const [sopDraft, setSopDraft] = useState({ title: "", body: "", role: "all" });

  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [estFilter, setEstFilter] = useState("All");
  const [invFilter, setInvFilter] = useState("All");
  const [confirmId, setConfirmId] = useState(null);
  const formRef = useRef(null);

  // ── load styles + saved data ──────────────────────────────────────────────
  useEffect(() => {
    const id = "serviceops-assets";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(link);
      const style = document.createElement("style");
      style.textContent = CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const load = async (key, fallback) => {
            try { const r = await window.storage.get(key, false); return r && r.value ? JSON.parse(r.value) : fallback; }
            catch (e) { return fallback; }
          };
          setPeople(await load(STORAGE.people, []));
          setClients(await load(STORAGE.clients, []));
          setPriceList(await load(STORAGE.price, SEED_PRICE));
          setEstimates(await load(STORAGE.estimates, []));
          setInvoices(await load(STORAGE.invoices, []));
          setSops(await load(STORAGE.sops, SEED_SOPS));
          setSuppliers(await load(STORAGE.suppliers, SEED_SUPPLIERS));
          const prof = await load(STORAGE.profile, emptyProfile());
          setProfile(prof); setProfileForm(prof);
          setNotifications(await load(STORAGE.notifications, []));
          setPayouts(await load(STORAGE.payouts, []));
          const st = await load(STORAGE.settings, { theme: "light", payout: DEFAULT_PAYOUT });
          setTheme(st && st.theme === "dark" ? "dark" : "light");
          const pa = st && Number(st.payout) > 0 ? Number(st.payout) : DEFAULT_PAYOUT;
          setPayoutAmt(pa); setPayoutDraft(String(pa));
          setNotifySent(!st || st.notifySent !== false);
          if (st && st.account) setAccount((a) => ({ ...a, ...st.account }));
          if (st && st.royaltyRange) { if (st.royaltyRange.from) setRoyaltyFrom(st.royaltyRange.from); if (st.royaltyRange.to) setRoyaltyTo(st.royaltyRange.to); }
          setAudit(await load(STORAGE.audit, []));
          setMessages(await load(STORAGE.messages, []));
          setMsgSeen(await load(STORAGE.msgSeen, {}));
          setOutreachVisits(await load(OUTREACH_VISITS_KEY, [])); // who walked which address, from the outreach app
        } else {
          setPriceList(SEED_PRICE); setSops(SEED_SOPS); setSuppliers(SEED_SUPPLIERS);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  async function save(key, next, setter) {
    setter(next);
    try { if (window.storage) await window.storage.set(key, JSON.stringify(next), false); }
    catch (e) { setErr("Couldn't save — changes are held for this session but may not persist."); }
  }

  // ── who's using it + permissions ────────────────────────────────────────────
  const currentUser = people.find((p) => p.id === currentUserId) || null;
  const role = currentUser ? currentUser.role : "Owner"; // default to Owner until someone is picked
  const myName = currentUser ? currentUser.name : "";
  const isAdmin = role === "Owner" || role === "Admin";
  function logAudit(action, detail) {
    const entry = { id: uid(), ts: Date.now(), who: myName || "Owner", role, action, detail: detail || "" };
    save(STORAGE.audit, [entry, ...audit].slice(0, 600), setAudit);
  }
  // ── in-app team messaging ──────────────────────────────────────────────────
  const actorKey = myName || "Owner";
  function threadOf(m) { return m.thread || "team"; }
  // Admin/owner can write to the whole team or any one person. An estimator can write
  // to the office (admins) on their own private line, or to the whole team.
  const msgTargets = isAdmin
    ? [{ key: "team", label: "Whole team" }].concat(people.filter((p) => (p.name || "").trim() && p.name !== myName).map((p) => ({ key: p.name, label: p.name })))
    : [{ key: actorKey, label: "The office" }, { key: "team", label: "Whole team" }];
  const msgAllowed = msgTargets.map((t) => t.key);
  const effTarget = msgAllowed.includes(msgTarget) ? msgTarget : msgTargets[0].key;
  // who can see a message: team is everyone; a person-thread is that person + all admins
  function canSeeMsg(m) { const th = threadOf(m); return th === "team" || isAdmin || th === actorKey; }
  const threadMsgs = messages.filter((m) => threadOf(m) === effTarget);
  function sendMessage() {
    const t = msgDraft.trim(); if (!t) return;
    const m = { id: uid(), ts: Date.now(), from: actorKey, role, thread: effTarget, text: t };
    save(STORAGE.messages, [...messages, m], setMessages);
    save(STORAGE.msgSeen, { ...msgSeen, [actorKey]: Date.now() }, setMsgSeen);
    setMsgDraft("");
  }
  function markMessagesSeen() { save(STORAGE.msgSeen, { ...msgSeen, [actorKey]: Date.now() }, setMsgSeen); }
  function unreadForThread(key) { return messages.filter((m) => threadOf(m) === key && m.ts > (msgSeen[actorKey] || 0) && m.from !== actorKey).length; }
  const unreadMsgs = messages.filter((m) => canSeeMsg(m) && m.ts > (msgSeen[actorKey] || 0) && m.from !== actorKey).length;
  const can = {
    seeNumbers: isAdmin,          // cost, margin, the financial dashboard
    editPrices: isAdmin,
    approve: isAdmin,
    seeAllWork: isAdmin,          // everyone's estimates/invoices vs. just mine
    editSops: isAdmin,
    importExport: isAdmin,        // CSV import/export of clients — Owner + Admin only
    editProfile: isAdmin,         // the business letterhead (logo + company info)
    managePeople: role === "Owner",
  };

  const TABS = [
    { key: "estimates", label: "Estimates", show: true },
    { key: "invoices", label: "Invoices", show: true },
    { key: "followups", label: "Follow-ups", show: true },
    { key: "clients", label: "Clients", show: true },
    { key: "prices", label: "Price List", show: true },
    { key: "mypay", label: "My pay", show: !can.seeNumbers },
    { key: "team", label: "Team", show: isAdmin },
    { key: "alerts", label: "Approvals", show: isAdmin },
    { key: "royalties", label: "Royalties", show: can.seeNumbers },
    { key: "numbers", label: "Numbers", show: can.seeNumbers },
    { key: "messages", label: "Messages", show: true },
    { key: "settings", label: "Settings", show: true },
  ].filter((t) => t.show);

  useEffect(() => { if (!TABS.some((t) => t.key === page)) setPage("estimates"); }, [role]);
  useEffect(() => { if (page === "messages") save(STORAGE.msgSeen, { ...msgSeen, [actorKey]: Date.now() }, setMsgSeen); }, [page]);

  // estimators always create under their own name
  useEffect(() => {
    if (role === "Estimator" && myName) {
      setEstForm((f) => (f.id ? f : { ...f, createdBy: myName }));
      setInvForm((f) => (f.id ? f : { ...f, createdBy: myName }));
    }
  }, [role, myName]);

  // ── scoping ─────────────────────────────────────────────────────────────────
  const myEstimates = can.seeAllWork ? estimates : estimates.filter((e) => (e.createdBy || "").trim() === myName);
  const myInvoices = can.seeAllWork ? invoices : invoices.filter((i) => (i.createdBy || "").trim() === myName);
  const awaitingApproval = estimates.filter((e) => e.status === "Submitted").length;
  const fuDueList = myEstimates.map((e) => ({ e, step: fuDueStep(e) })).filter((x) => x.step).sort((a, b) => a.step.dueTs - b.step.dueTs);
  const fuUpcoming = myEstimates.filter((e) => fuActive(e)).map((e) => ({ e, step: fuNext(e) })).filter((x) => x.step && !x.step.due).sort((a, b) => a.step.dueTs - b.step.dueTs);

  const clientNames = Array.from(new Set(clients.map((c) => c.company).filter(Boolean)));
  const priceNames = priceList.map((p) => p.name).filter(Boolean);
  const repNames = Array.from(new Set([...people.map((p) => p.name), myName].map((s) => (s || "").trim()).filter(Boolean))).sort();
  const priceByName = (name) => priceList.find((p) => p.name === name);

  // cost lookup for margin math (admin "numbers")
  function costOfLine(l) { const p = priceByName(l.name); return p ? num(p.cost) * num(l.qty) : 0; }
  function costOfLines(lines) { return (lines || []).reduce((s, l) => s + costOfLine(l), 0); }

  // ── line-item editing (shared by estimate & invoice builders) ─────────────────
  function setLine(form, setForm, lineId, key, val) {
    setForm({ ...form, lines: form.lines.map((l) => (l.id === lineId ? { ...l, [key]: val } : l)) });
  }
  function pickItem(form, setForm, lineId, name) {
    const p = priceByName(name);
    setForm({ ...form, lines: form.lines.map((l) => (l.id === lineId ? { ...l, name, unitPrice: p ? p.price : l.unitPrice } : l)) });
  }
  function addLine(form, setForm) { setForm({ ...form, lines: [...form.lines, emptyLine()] }); }
  function removeLine(form, setForm, lineId) {
    const next = form.lines.filter((l) => l.id !== lineId);
    setForm({ ...form, lines: next.length ? next : [emptyLine()] });
  }

  // ── estimates ─────────────────────────────────────────────────────────────────
  function saveEstimate(status) {
    if (!estForm.client.trim()) { setErr("Enter the contact's full name first."); return; }
    setErr("");
    const rec = { ...estForm, status: status || estForm.status, createdBy: estForm.createdBy || myName || "Owner" };
    // if this is a brand-new full name + full address, add it to the shared contact list so it pops up next time
    if (rec.client.trim() && rec.clientAddr && rec.clientAddr.trim() && !matchContact(rec.client, rec.clientAddr)) {
      save(STORAGE.clients, [{ ...emptyClient(), id: uid(), company: rec.client.trim(), address: rec.clientAddr.trim(), owner: myName || "Owner" }, ...clients], setClients);
    }
    if (rec.id) save(STORAGE.estimates, estimates.map((e) => (e.id === rec.id ? rec : e)), setEstimates);
    else save(STORAGE.estimates, [{ ...rec, id: uid() }, ...estimates], setEstimates);
    logAudit(rec.id ? "Edited estimate" : "Created estimate", (rec.client || "") + (rec.estimateNo ? " #" + rec.estimateNo : ""));
    setEstForm(emptyEstimate());
  }
  function editEstimate(e) { setEstForm({ ...emptyEstimate(), ...e, lines: e.lines && e.lines.length ? e.lines : [emptyLine()] }); setPage("estimates"); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }
  function setEstStatus(id, status) { const e = estimates.find((x) => x.id === id); save(STORAGE.estimates, estimates.map((x) => (x.id === id ? { ...x, status } : x)), setEstimates); logAudit("Estimate → " + status, e ? (e.client || "") + (e.estimateNo ? " #" + e.estimateNo : "") : ""); }
  function removeEstimate(id) { save(STORAGE.estimates, estimates.filter((e) => e.id !== id), setEstimates); setConfirmId(null); }
  function convertToInvoice(e) {
    logAudit("Converted estimate to invoice", e.client || ""); setInvForm({ ...emptyInvoice(), client: e.client, address: e.clientAddr || (clientOf(e.client)?.address) || "", createdBy: e.createdBy || myName, fromEstimate: e.estimateNo || e.id, mode: e.mode || "itemized", lines: (e.lines || []).map((l) => ({ ...l, id: uid() })), lumpDescription: e.lumpDescription || "", lumpPrice: e.lumpPrice || "", notes: e.notes });
    save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, invoiced: true } : x)), setEstimates);
    setPage("invoices");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }
  function archiveEstimate(id, on) { save(STORAGE.estimates, estimates.map((e) => (e.id === id ? { ...e, archived: on } : e)), setEstimates); }
  function markSentToClient(id) {
    const e = estimates.find((x) => x.id === id);
    save(STORAGE.estimates, estimates.map((x) => (x.id === id ? { ...x, sentAt: toLocalDate(new Date()), fuDone: 0, fuStopped: false } : x)), setEstimates);
    if (e) noticeSent("estimate", e);
  }
  function advanceFu(id) { save(STORAGE.estimates, estimates.map((e) => (e.id === id ? { ...e, fuDone: (e.fuDone || 0) + 1 } : e)), setEstimates); }
  function stopFu(id) { save(STORAGE.estimates, estimates.map((e) => (e.id === id ? { ...e, fuStopped: true } : e)), setEstimates); }

  // ── admin notifications (persist until dismissed) ──────────────────────────
  function addNotification(n) {
    save(STORAGE.notifications, [{ id: uid(), ts: Date.now(), read: false, ...n }, ...notifications], setNotifications);
  }
  function dismissNotification(id) { save(STORAGE.notifications, notifications.filter((n) => n.id !== id), setNotifications); }
  function clearNotifications() { save(STORAGE.notifications, [], setNotifications); }

  // record a phone-call outcome on a follow-up
  function logCallOutcome(e, outcome) {
    const date = callDate[e.id] || toLocalDate(new Date());
    const patch = { lastCallAt: date, lastCallOutcome: outcome };
    if (outcome === "deciding") {
      // keep the sequence going — move to the next step
      save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, ...patch, fuDone: (x.fuDone || 0) + 1 } : x)), setEstimates);
    } else if (outcome === "lost") {
      // went with someone else — stop all follow-ups
      save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, ...patch, status: "Declined", fuStopped: true } : x)), setEstimates);
    } else if (outcome === "approved") {
      approveEstimate(e, "phone call", date);
    }
    setCallDate((m) => { const c = { ...m }; delete c[e.id]; return c; });
  }

  // mark approved + notify the admin (called from a phone outcome OR a client signature)
  function approveEstimate(e, via, date, signedName, signature) {
    const patch = { status: "Approved", fuStopped: true, approvedAt: date || toLocalDate(new Date()), approvedVia: via };
    if (signedName) patch.signedName = signedName;
    if (signature) patch.signature = signature;
    if (signedName || signature) patch.signedAt = date || toLocalDate(new Date());
    save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, ...patch } : x)), setEstimates);
    addNotification({ type: "approved", estimateNo: e.estimateNo || "", client: e.client || "", total: recTotals(e).total, via, signedName: signedName || "" });
    logAudit("Estimate approved", (e.client || "") + " · " + via);
  }
  function signEstimate(e, signedName, signature) {
    if (!signedName && !signature) { setErr("Please sign or type a full name to approve."); return; }
    approveEstimate(e, "client signature", toLocalDate(new Date()), signedName, signature);
    setSignFor(null);
    setErr("Estimate approved — the office has been notified.");
  }
  function declineByClient(e) {
    save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, status: "Declined", fuStopped: true, declinedAt: toLocalDate(new Date()) } : x)), setEstimates);
    addNotification({ type: "declined", estimateNo: e.estimateNo || "", client: e.client || "", total: recTotals(e).total, via: "client declined" });
    setSignFor(null); logAudit("Estimate declined by client", e.client || "");
    setErr("Marked declined — the office has been notified.");
  }
  function clientThinking(e) {
    save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, clientThinking: true, thinkingAt: toLocalDate(new Date()) } : x)), setEstimates);
    setSignFor(null);
    setErr("Noted — we'll keep following up. No rush.");
  }
  function clientOf(name) { return clients.find((c) => (c.company || "") === name) || null; }
  function saveProfile() { save(STORAGE.profile, profileForm, setProfile); logAudit("Updated business profile", profileForm.name || ""); setErr("Business profile saved."); }
  // exact match needs BOTH the full name and the full address
  function matchContact(name, addr) {
    const n = normExact(name), a = normExact(addr);
    if (!n || !a) return null;
    const pool = can.seeAllWork ? clients : clients.filter((c) => (c.owner || "") === myName);
    return pool.find((c) => normExact(c.company) === n && normExact(c.address) === a) || null;
  }
  // each rep sees only their own clients; admins see all
  const myClients = can.seeAllWork ? clients : clients.filter((c) => (c.owner || "") === myName);
  // effective legal text (their saved version, or the premade template prefilled with their company name)
  const warrantyText = () => (profile.warranty && profile.warranty.trim()) ? profile.warranty : defaultWarranty(profile.name);
  const contractText = () => (profile.contract && profile.contract.trim()) ? profile.contract : defaultContract(profile.name);
  // the letterhead block that goes at the top of every emailed estimate/invoice — THEIR info, not ours
  function letterhead() {
    const p = profile;
    const lines = [p.name || "", p.tagline || "", p.address || "",
      [p.phone, p.email].filter(Boolean).join("  ·  "), p.website || ""].filter(Boolean);
    return lines.length ? lines.join("\n") + "\n" + "—".repeat(28) + "\n\n" : "";
  }
  // fill {tokens} from the company info + the estimate
  function fillTemplate(tpl, e) {
    const c = clientOf(e.client);
    const t = recTotals(e).total;
    const first = (c && c.contact) ? c.contact.split(" ")[0] : "there";
    const bal = (e.payments !== undefined) ? invBalance(e) : t;
    return (tpl || "")
      .replace(/\{first\}/g, first)
      .replace(/\{client\}/g, e.client || "")
      .replace(/\{estimate_no\}/g, e.estimateNo ? "#" + e.estimateNo : "")
      .replace(/\{invoice_no\}/g, e.invoiceNo ? "#" + e.invoiceNo : "")
      .replace(/\{total\}/g, t ? money(t) : "")
      .replace(/\{balance\}/g, money(bal))
      .replace(/\{due_date\}/g, e.dueDate ? fmtDate(e.dueDate) : "")
      .replace(/\{review_url\}/g, profile.reviewUrl || "")
      .replace(/\{company\}/g, profile.name || e.createdBy || "");
  }
  function reminderBody(e, which) {
    const tpl = which === 2 ? (profile.emailFollowup2 || DEFAULT_FOLLOWUP_2) : (profile.emailFollowup1 || DEFAULT_FOLLOWUP_1);
    return `${letterhead()}${fillTemplate(tpl, e)}`;
  }
  function reminderMailto(e, which) {
    const c = clientOf(e.client); const to = c && c.email ? c.email : "";
    const subject = `Following up on your estimate${e.estimateNo ? " #" + e.estimateNo : ""}`;
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reminderBody(e, which))}`;
  }
  function copyReminder(e, which) { try { navigator.clipboard && navigator.clipboard.writeText(reminderBody(e, which)); setErr("Reminder text copied to the clipboard."); } catch (e2) {} }
  // review-request email, 3 days after an invoice is sent
  function reviewBody(i) { return `${letterhead()}${fillTemplate(profile.emailReview || DEFAULT_REVIEW, i)}`; }
  function reviewBody(i) {
    const base = `${letterhead()}${fillTemplate(profile.emailReview || DEFAULT_REVIEW, i)}`;
    return profile.reviewUrl ? `${base}\n\nLeave a review: ${profile.reviewUrl}` : base;
  }
  function reviewMailto(i) {
    const c = clientOf(i.client); const to = c && c.email ? c.email : "";
    const subject = `Thank you from ${profile.name || "our team"}${i.invoiceNo ? " — invoice #" + i.invoiceNo : ""}`;
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reviewBody(i))}`;
  }
  function markReviewSent(id) { save(STORAGE.invoices, invoices.map((i) => (i.id === id ? { ...i, reviewSent: true } : i)), setInvoices); }

  // ── overdue invoices: due date, reminder email, admin warning, collections ──
  function isPastDue(i) { if (!i.dueDate || i.archived) return false; const due = new Date(i.dueDate + "T23:59:59").getTime(); return invBalance(i) > 0.005 && Date.now() > due + OVERDUE_GRACE_DAYS * DAY; }
  function overdueBody(i) { return `${letterhead()}${fillTemplate(profile.emailOverdue || DEFAULT_OVERDUE, i)}`; }
  function overdueMailto(i) {
    const c = clientOf(i.client); const to = c && c.email ? c.email : "";
    const subject = `Past-due reminder${i.invoiceNo ? " — invoice #" + i.invoiceNo : ""}`;
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(overdueBody(i))}`;
  }
  function markOverdueSent(i) {
    save(STORAGE.invoices, invoices.map((x) => (x.id === i.id ? { ...x, overdueEmailSent: true, overdueEmailSentAt: toLocalDate(new Date()) } : x)), setInvoices);
    logAudit("Past-due notice sent", (i.client || "") + (i.invoiceNo ? " #" + i.invoiceNo : ""));
  }
  function markCollectionDone(id) { const inv = invoices.find((i) => i.id === id); save(STORAGE.invoices, invoices.map((i) => (i.id === id ? { ...i, collectionDone: true } : i)), setInvoices); logAudit("Collections cleared", inv ? (inv.client || "") : ""); }
  const COLLECT_AFTER_DAYS = 7;
  // overdue, no reminder sent yet → ready to send
  const overdueToSend = invoices.filter((i) => isPastDue(i) && !i.overdueEmailSent);
  // reminder sent, still unpaid, within the grace window → admin is watching it
  const overdueWatching = invoices.filter((i) => i.overdueEmailSent && !i.collectionDone && invBalance(i) > 0.005 && !i.archived && i.overdueEmailSentAt && (Date.now() - new Date(i.overdueEmailSentAt + "T09:00:00").getTime()) < COLLECT_AFTER_DAYS * DAY);
  // reminder sent 7+ days ago, still unpaid → admin should call (escalation / banner)
  const collectionsDue = invoices.filter((i) => i.overdueEmailSent && !i.collectionDone && invBalance(i) > 0.005 && !i.archived && i.overdueEmailSentAt && (Date.now() - new Date(i.overdueEmailSentAt + "T09:00:00").getTime()) >= COLLECT_AFTER_DAYS * DAY);
  const approvalNotices = notifications.filter((n) => n.type !== "sent");
  const sentNotices = notifications.filter((n) => n.type === "sent");
  function clearSent() { save(STORAGE.notifications, notifications.filter((n) => n.type !== "sent"), setNotifications); }
  // capture a client's email when someone tries to send without one
  function saveClientEmail(r) {
    const addr = emailDraft.trim();
    if (!addr) { setErr("Enter the client's email."); return; }
    const co = r.client || "";
    const existing = clients.find((c) => (c.company || "") === co);
    if (existing) save(STORAGE.clients, clients.map((c) => (c.id === existing.id ? { ...c, email: addr } : c)), setClients);
    else save(STORAGE.clients, [{ ...emptyClient(), id: uid(), company: co, email: addr, owner: myName || "Owner" }, ...clients], setClients);
    setEmailPromptFor(null); setEmailDraft(""); setErr("");
  }
  const REVIEW_AFTER_DAYS = 3;
  const reviewDue = invoices.filter((i) => i.sentAt && !i.reviewSent && !i.archived && (Date.now() - new Date(i.sentAt.length <= 10 ? i.sentAt + "T09:00:00" : i.sentAt).getTime()) >= REVIEW_AFTER_DAYS * DAY);

  // build a plain-text body of an estimate/invoice (itemized list or lump description) for emailing
  function docLines(r) {
    if (r.mode === "lumpsum") return (r.lumpDescription ? r.lumpDescription + "\n\n" : "") + "Total: " + money(recTotals(r).total);
    const rows = (r.lines || []).filter((l) => l.name || num(l.unitPrice)).map((l) => `• ${l.name || "item"} — ${num(l.qty)} × ${money(num(l.unitPrice))} = ${money(lineTotal(l))}`);
    return rows.join("\n") + "\n\nTotal: " + money(recTotals(r).total);
  }
  function docBodyText(r, kind) {
    const c = clientOf(r.client);
    const no = kind === "invoice" ? r.invoiceNo : r.estimateNo;
    const first = c && c.contact ? " " + c.contact.split(" ")[0] : "";
    const sign = profile.name || r.createdBy || "";
    const desc = (kind === "estimate" && r.jobDescription) ? r.jobDescription + "\n\n" : "";
    const legal = (kind === "estimate" && r.attachLegal !== false)
      ? `\n\n${"=".repeat(28)}\n${warrantyText()}\n\n${"=".repeat(28)}\n${contractText()}`
      : "";
    return `${letterhead()}Hi${first},\n\nHere is your ${kind}${no ? " (#" + no + ")" : ""}:\n\n${desc}${docLines(r)}${r.notes ? "\n\n" + r.notes : ""}${legal}\n\nThanks,\n${sign}`;
  }
  function sendDocMailto(r, kind, toSelf) {
    const c = clientOf(r.client);
    const to = toSelf ? (profile.email || (currentUser && currentUser.email) || "") : (c && c.email ? c.email : "");
    const no = kind === "invoice" ? r.invoiceNo : r.estimateNo;
    const subject = `${toSelf ? "[PREVIEW] " : ""}${kind === "invoice" ? "Invoice" : "Estimate"}${no ? " #" + no : ""}${r.client ? " — " + r.client : ""}`;
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(docBodyText(r, kind))}`;
  }

  // ── photos (camera / gallery), downscaled so storage stays light ───────────
  function fileToScaledDataUrl(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) { if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; } else { w = Math.round(w * maxDim / h); h = maxDim; } }
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(cv.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject; img.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }
  async function handlePhotos(fileList, setForm) {
    const files = Array.from(fileList || []).filter((f) => f.type && f.type.startsWith("image/"));
    if (!files.length) return;
    const urls = [];
    for (const f of files) { try { urls.push(await fileToScaledDataUrl(f, 1100, 0.7)); } catch (e) {} }
    if (urls.length) setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
  }
  function removePhoto(setForm, idx) { setForm((prev) => ({ ...prev, photos: (prev.photos || []).filter((_, i) => i !== idx) })); }

  // push qualifying invoices into the outreach app's commission feed (matched by address there)
  async function syncToOutreach(list) {
    if (!window.storage || !list.length) return;
    let existing = [];
    try { const r = await window.storage.get(OUTREACH_INVOICES_KEY, false); if (r && r.value) existing = JSON.parse(r.value); } catch (e) {}
    const incoming = list.map((i) => ({
      id: "so:" + i.id,                       // stable id so re-syncing updates instead of duplicating
      invoiceNo: i.invoiceNo || "",
      date: i.date || "",
      company: i.client || "",
      address: i.address || "",
      total: recTotals(i).total,
      profit: recSub(i) - costOfLines(i.lines),
      repOverride: "",                        // let the outreach app match by address
      approved: true,
      src: "serviceops",
    }));
    const ids = new Set(incoming.map((x) => x.id));
    const merged = [...incoming, ...existing.filter((e) => !ids.has(e.id))];
    try { await window.storage.set(OUTREACH_INVOICES_KEY, JSON.stringify(merged), false); }
    catch (e) { setErr("Couldn't reach the outreach app's storage."); return; }
    const sent = new Set(list.map((l) => l.id));
    save(STORAGE.invoices, invoices.map((iv) => (sent.has(iv.id) ? { ...iv, pushedToOutreach: true } : iv)), setInvoices);
    setErr(`Sent ${list.length} invoice${list.length === 1 ? "" : "s"} to the outreach app — the royalty shows on its Commissions tab.`);
  }

  // ── invoices ────────────────────────────────────────────────────────────────
  function saveInvoice(status) {
    if (!invForm.client.trim()) { setErr("Pick or enter a client first."); return; }
    setErr("");
    const rec = { ...invForm, status: status || invForm.status, createdBy: invForm.createdBy || myName || "Owner" };
    if (rec.status === "Sent" && !rec.sentAt) rec.sentAt = toLocalDate(new Date());
    let id = rec.id;
    if (rec.id) save(STORAGE.invoices, invoices.map((i) => (i.id === rec.id ? rec : i)), setInvoices);
    else { id = uid(); save(STORAGE.invoices, [{ ...rec, id }, ...invoices], setInvoices); }
    if ((rec.status === "Sent")) { ensurePayout({ ...rec, id }); noticeSent("invoice", { ...rec, id }); }
    logAudit(rec.id ? "Edited invoice" : "Created invoice", (rec.client || "") + (rec.invoiceNo ? " #" + rec.invoiceNo : ""));
    setInvForm(emptyInvoice());
  }
  function editInvoice(i) { setInvForm({ ...emptyInvoice(), ...i, lines: i.lines && i.lines.length ? i.lines : [emptyLine()] }); setPage("invoices"); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }
  function setInvStatus(id, status) {
    save(STORAGE.invoices, invoices.map((i) => (i.id === id ? { ...i, status, sentAt: (status === "Sent" && !i.sentAt) ? toLocalDate(new Date()) : i.sentAt } : i)), setInvoices);
    if (status === "Sent") { const inv = invoices.find((i) => i.id === id); if (inv) { ensurePayout(inv); noticeSent("invoice", inv); } }
    { const inv2 = invoices.find((i) => i.id === id); logAudit("Invoice → " + status, inv2 ? (inv2.client || "") + (inv2.invoiceNo ? " #" + inv2.invoiceNo : "") : ""); }
  }
  function removeInvoice(id) { save(STORAGE.invoices, invoices.filter((i) => i.id !== id), setInvoices); setConfirmId(null); }

  // ── payments: log each one, track the balance, mark Done when paid in full ──
  function invPaidAmt(i) { return (i.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0); }
  function invBalance(i) { return Math.max(0, recTotals(i).total - invPaidAmt(i)); }
  function recordPayment(inv) {
    const d = payDraft;
    const amt = num(d.amount);
    if (amt <= 0) { setErr("Enter the payment amount."); return; }
    const method = d.method === "Other" ? (d.methodOther.trim() || "Other") : d.method;
    const pay = { id: uid(), amount: amt, method: method || "Card", date: d.date || toLocalDate(new Date()), ts: Date.now() };
    const nextPayments = [...(inv.payments || []), pay];
    const paid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const done = paid >= recTotals(inv).total - 0.005;
    save(STORAGE.invoices, invoices.map((x) => (x.id === inv.id ? { ...x, payments: nextPayments, status: done ? "Paid" : x.status } : x)), setInvoices);
    logAudit("Recorded payment", money(amt) + " " + method + " · " + (inv.client || ""));
    setPayFor(null); setPayDraft({ amount: "", method: "Card", methodOther: "", date: toLocalDate(new Date()) }); setErr("");
  }
  function removePayment(invId, payId) {
    save(STORAGE.invoices, invoices.map((x) => {
      if (x.id !== invId) return x;
      const nextPayments = (x.payments || []).filter((p) => p.id !== payId);
      const paid = nextPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const stillDone = paid >= recTotals(x).total - 0.005;
      return { ...x, payments: nextPayments, status: stillDone ? "Paid" : (x.status === "Paid" ? "Sent" : x.status) };
    }), setInvoices);
  }
  function archiveInvoice(id, on) { save(STORAGE.invoices, invoices.map((i) => (i.id === id ? { ...i, archived: on } : i)), setInvoices); }

  // ── admin oversight: follow-ups that are running late ──────────────────────
  function repEmailByName(name) { const p = people.find((x) => (x.name || "") === name); return p && p.email ? p.email : ""; }
  function lateRepMailto(e) {
    const to = repEmailByName(e.createdBy);
    const subject = `Follow-up overdue — ${e.client || "estimate"}${e.estimateNo ? " #" + e.estimateNo : ""}`;
    const body = `Hi ${e.createdBy || ""},\n\nThe follow-up on ${e.client || "this estimate"}${e.estimateNo ? " (#" + e.estimateNo + ")" : ""} is past due. Could you reach out to the client and update its status, or let me know what's going on so we can keep it moving?\n\nThanks`;
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function dismissLate(e) {
    const reason = (lateReason[e.id] || "").trim();
    save(STORAGE.estimates, estimates.map((x) => (x.id === e.id ? { ...x, lateDismissed: true, lateReason: reason, fuStopped: true } : x)), setEstimates);
    setLateReason((m) => { const c = { ...m }; delete c[e.id]; return c; });
  }

  // ── appearance + help ──────────────────────────────────────────────────────
  function saveSettings(patch) { save(STORAGE.settings, { theme, payout: payoutAmt, ...patch }, () => {}); }
  function saveSettings(patch) { save(STORAGE.settings, { theme, payout: payoutAmt, notifySent, account, royaltyRange: { from: royaltyFrom, to: royaltyTo }, ...patch }, () => {}); }
  function applyTheme(t) { setTheme(t); saveSettings({ theme: t }); }
  function setSub(status) { const a = { ...account, status, startedAt: account.startedAt || toLocalDate(new Date()) }; setAccount(a); saveSettings({ account: a }); logAudit("Subscription " + status, ""); }
  function saveAccount() { saveSettings({ account }); setErr("Account saved."); }
  function toggleNotifySent() { const v = !notifySent; setNotifySent(v); saveSettings({ notifySent: v }); }
  // copy the owner/admin on every estimate/invoice that goes out (in-app notice + a copy)
  function noticeSent(kind, rec) {
    if (!notifySent) return;
    addNotification({ type: "sent", kind, no: kind === "invoice" ? (rec.invoiceNo || "") : (rec.estimateNo || ""), client: rec.client || "", total: recTotals(rec).total, body: docLines(rec) });
  }
  function savePayout() {
    const v = num(payoutDraft);
    if (v < 0) { setErr("Enter a valid amount."); return; }
    setPayoutAmt(v); setPayoutDraft(String(v)); saveSettings({ payout: v }); logAudit("Changed default payout", money(v)); setErr("Estimator payout saved.");
  }
  function supportMailto() {
    const f = supportForm;
    const subject = `Support — ${f.app || "ReyGuild"}`;
    const body = `Name: ${f.name || ""}\nEmail: ${f.email || ""}\nApp: ${f.app || ""}\n\n${f.message || ""}`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  const helpResults = (() => {
    const q = helpQuery.trim().toLowerCase();
    if (!q) return HELP_ARTICLES;
    const words = q.split(/\s+/);
    return HELP_ARTICLES.filter((a) => {
      const hay = (a.title + " " + a.keywords + " " + a.body).toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  })();

  // ── rep payouts ($50 per invoice, admin-approved) ──────────────────────────
  function payoutFor(name) {
    const p = people.find((x) => (x.name || "") === name);
    const v = p && p.payout !== undefined && p.payout !== "" ? Number(p.payout) : NaN;
    return (!isNaN(v) && v >= 0) ? v : payoutAmt;
  }
  function ensurePayout(inv) {
    if (!inv || !inv.id) return;
    if (payouts.some((p) => p.invoiceId === inv.id)) return; // one payout per invoice
    const who = inv.createdBy || myName || "Owner";
    save(STORAGE.payouts, [{ id: uid(), invoiceId: inv.id, invoiceNo: inv.invoiceNo || "", rep: who, client: inv.client || "", address: inv.address || "", amount: payoutFor(who), status: "Pending", ts: Date.now() }, ...payouts], setPayouts);
  }
  function setPayoutStatus(id, status) { const po = payouts.find((p) => p.id === id); save(STORAGE.payouts, payouts.map((p) => (p.id === id ? { ...p, status, decidedAt: Date.now() } : p)), setPayouts); logAudit("Payout " + status, po ? money(po.amount) + " → " + (po.rep || "") : ""); }

  // ── royalty period printouts ───────────────────────────────────────────────
  function lastPaymentTs(i) { return Math.max(0, ...((i.payments || []).map((p) => p.ts || 0))); }
  function rangeStart() { return new Date((royaltyFrom || "1970-01-01") + "T00:00:00").getTime(); }
  function rangeEnd() { return new Date((royaltyTo || toLocalDate(new Date())) + "T23:59:59").getTime(); }
  function rangeTag() { return (royaltyFrom || "") + "_to_" + (royaltyTo || ""); }
  // Export 1: who is owed — the per-invoice payouts in the chosen range
  function exportRoyaltiesOwed() {
    if (royaltyFrom && royaltyTo && royaltyFrom > royaltyTo) { setErr("The 'From' date is after the 'To' date."); return; }
    saveSettings({ royaltyRange: { from: royaltyFrom, to: royaltyTo } });
    const start = rangeStart(), end = rangeEnd();
    const rows = [["Estimator", "Invoice", "Client", "Address", "Amount", "Status", "Date"]];
    payouts.filter((p) => (p.ts || 0) >= start && (p.ts || 0) <= end).forEach((p) => rows.push([p.rep || "", p.invoiceNo || "", p.client || "", p.address || "", p.amount || 0, p.status || "", toLocalDate(new Date(p.ts || Date.now()))]));
    if (rows.length === 1) { setErr("No payouts in that time frame."); return; }
    if (!downloadTextFile(`royalties-owed-${rangeTag()}.csv`, toCsv(rows), "text/csv;charset=utf-8")) setErr("Couldn't create the file.");
  }
  // Export 2: addresses of invoices paid in full in the chosen range — to feed the outreach site
  function exportPaidAddresses() {
    if (royaltyFrom && royaltyTo && royaltyFrom > royaltyTo) { setErr("The 'From' date is after the 'To' date."); return; }
    saveSettings({ royaltyRange: { from: royaltyFrom, to: royaltyTo } });
    const start = rangeStart(), end = rangeEnd();
    const rows = [["Address", "Client", "Invoice", "Date paid", "Amount", "Estimator"]];
    invoices.filter((i) => invBalance(i) <= 0.005 && (i.payments || []).length && lastPaymentTs(i) >= start && lastPaymentTs(i) <= end).forEach((i) => rows.push([i.address || "", i.client || "", i.invoiceNo || "", toLocalDate(new Date(lastPaymentTs(i))), recTotals(i).total, i.createdBy || ""]));
    if (rows.length === 1) { setErr("No invoices were paid in full in that time frame."); return; }
    if (!downloadTextFile(`paid-addresses-${rangeTag()}.csv`, toCsv(rows), "text/csv;charset=utf-8")) setErr("Couldn't create the file.");
  }
  const pendingPayouts = payouts.filter((p) => p.status === "Pending");
  // flag likely duplicates: same job (address, or client if no address) on the same calendar day
  const payoutDupKey = (p) => normExact(p.address || p.client) + "|" + new Date(p.ts).toDateString();
  const dupCounts = pendingPayouts.reduce((m, p) => { const k = payoutDupKey(p); m[k] = (m[k] || 0) + 1; return m; }, {});
  const isDupPayout = (p) => dupCounts[payoutDupKey(p)] > 1;
  // follow-ups (calls) running more than 3 days late, for admin oversight
  const lateFollowups = estimates
    .filter((e) => fuActive(e) && !e.lateDismissed)
    .map((e) => ({ e, step: fuDueStep(e) }))
    .filter((x) => x.step && x.step.overdueDays > 3);
  const myPayouts = isAdmin ? payouts : payouts.filter((p) => (p.rep || "") === myName);
  const payApproved = myPayouts.filter((p) => p.status === "Approved").reduce((s, p) => s + (p.amount || 0), 0);
  const payPending = myPayouts.filter((p) => p.status === "Pending").reduce((s, p) => s + (p.amount || 0), 0);
  const payDenied = myPayouts.filter((p) => p.status === "Denied").length;

  // ── clients ──────────────────────────────────────────────────────────────────
  function saveClient() {
    if (!clientForm.company.trim()) { setErr("Add a company name."); return; }
    setErr("");
    if (clientForm.id) save(STORAGE.clients, clients.map((c) => (c.id === clientForm.id ? clientForm : c)), setClients);
    else save(STORAGE.clients, [{ ...clientForm, id: uid(), owner: clientForm.owner || myName || "Owner" }, ...clients], setClients);
    logAudit(clientForm.id ? "Edited client" : "Added client", clientForm.company || "");
    setClientForm(emptyClient());
  }
  function removeClient(id) { save(STORAGE.clients, clients.filter((c) => c.id !== id), setClients); setConfirmId(null); }
  function onClientCsv(e) {
    const file = e.target.files && e.target.files[0];
    if (e.target) e.target.value = ""; // let the same file be re-picked
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const res = Papa.parse(reader.result.toString().trim(), { header: true, skipEmptyLines: true });
        const fields = (res.meta && res.meta.fields) || [];
        if (!fields.length) { setCliCsvErr("Couldn't find column headers in that file."); return; }
        setCliCsv({ fields, rows: res.data, fileName: file.name });
        setCliMap(guessClientMap(fields));
        setCliCsvErr("");
      } catch (err) { setCliCsvErr("Couldn't read that CSV. Make sure it's a plain .csv export."); }
    };
    reader.readAsText(file);
  }
  function doClientImport() {
    if (!cliCsv) return;
    if (!cliMap.company) { setCliCsvErr("Pick which column holds the company / client name."); return; }
    const get = (r, k) => (cliMap[k] ? (r[cliMap[k]] || "").toString().trim() : "");
    const rows = cliCsv.rows
      .map((r) => ({ id: uid(), company: get(r, "company"), contact: get(r, "contact"), phone: get(r, "phone"), email: get(r, "email"), address: get(r, "address"), notes: get(r, "notes") }))
      .filter((c) => c.company);
    // skip anyone already on the list (match on company name, case-insensitive)
    const existing = new Set(clients.map((c) => (c.company || "").trim().toLowerCase()));
    const fresh = rows.filter((c) => !existing.has(c.company.toLowerCase()));
    const skipped = rows.length - fresh.length;
    save(STORAGE.clients, [...fresh, ...clients], setClients);
    setCliCsv(null);
    setCliCsvErr(skipped > 0 ? "" : "");
    if (skipped > 0) setErr(`Imported ${fresh.length} clients · skipped ${skipped} already on the list.`);
  }
  function exportClientsCsv() {
    const rows = clients.map((c) => ({ Company: c.company || "", Contact: c.contact || "", Phone: c.phone || "", Email: c.email || "", Address: c.address || "", Notes: c.notes || "" }));
    const csv = Papa.unparse(rows.length ? rows : [{ Company: "", Contact: "", Phone: "", Email: "", Address: "", Notes: "" }]);
    try {
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "clients.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (e) { /* download may be blocked in some preview sandboxes */ }
  }

  // ── price list ───────────────────────────────────────────────────────────────
  function savePriceItem() {
    if (!priceForm.name.trim()) { setErr("Name the item."); return; }
    setErr("");
    const rec = { ...priceForm, price: num(priceForm.price), cost: num(priceForm.cost) };
    if (rec.id) save(STORAGE.price, priceList.map((p) => (p.id === rec.id ? rec : p)), setPriceList);
    else save(STORAGE.price, [...priceList, { ...rec, id: uid() }], setPriceList);
    setPriceForm(emptyPriceItem());
  }
  function removePriceItem(id) { save(STORAGE.price, priceList.filter((p) => p.id !== id), setPriceList); setConfirmId(null); }
  function saveSupplier() {
    if (!supplierForm.name.trim() || !supplierForm.url.trim()) { setErr("A supplier needs a name and a link."); return; }
    setErr("");
    let url = supplierForm.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url; // tolerate "lowes.com"
    const rec = { ...supplierForm, url };
    if (rec.id) save(STORAGE.suppliers, suppliers.map((s) => (s.id === rec.id ? rec : s)), setSuppliers);
    else save(STORAGE.suppliers, [...suppliers, { ...rec, id: uid() }], setSuppliers);
    setSupplierForm(emptySupplier());
  }
  function removeSupplier(id) { save(STORAGE.suppliers, suppliers.filter((s) => s.id !== id), setSuppliers); setConfirmId(null); }

  // ── people ───────────────────────────────────────────────────────────────────
  function savePerson() {
    if (!personForm.name.trim()) { setErr("Add a name."); return; }
    setErr("");
    if (personForm.id) save(STORAGE.people, people.map((p) => (p.id === personForm.id ? personForm : p)), setPeople);
    else save(STORAGE.people, [...people, { ...personForm, id: uid() }], setPeople);
    logAudit(personForm.id ? "Edited person" : "Added person", personForm.name || "");
    setPersonForm(emptyPerson());
  }
  function removePerson(id) { save(STORAGE.people, people.filter((p) => p.id !== id), setPeople); setConfirmId(null); }

  // ── SOPs ─────────────────────────────────────────────────────────────────────
  function startSop(s) { setSopEditId(s ? s.id : "new"); setSopDraft(s ? { title: s.title, body: s.body, role: s.role || "all" } : { title: "", body: "", role: "all" }); }
  function saveSop() {
    if (!sopDraft.title.trim()) { setSopEditId(null); return; }
    if (sopEditId === "new") save(STORAGE.sops, [...sops, { id: uid(), ...sopDraft }], setSops);
    else save(STORAGE.sops, sops.map((s) => (s.id === sopEditId ? { ...s, ...sopDraft } : s)), setSops);
    setSopEditId(null);
  }
  function removeSop(id) { save(STORAGE.sops, sops.filter((s) => s.id !== id), setSops); setConfirmId(null); }

  // ── filtered lists ────────────────────────────────────────────────────────────
  const shownEstimates = myEstimates.filter((e) => {
    if (estFilter === "Cleared") { if (!e.archived) return false; }
    else { if (e.archived) return false;
      if (estFilter === "Pending") { if (e.status === "Approved" || e.status === "Declined") return false; }
      else if (estFilter !== "All" && e.status !== estFilter) return false;
    }
    if (query.trim()) { const hay = [e.client, e.estimateNo, e.createdBy, e.notes, e.lumpDescription].join(" ").toLowerCase(); if (!hay.includes(query.toLowerCase())) return false; }
    return true;
  });
  const shownInvoices = myInvoices.filter((i) => {
    if (invFilter === "Archived") { if (!i.archived) return false; }
    else { if (i.archived) return false; if (invFilter !== "All" && i.status !== invFilter) return false; }
    if (query.trim()) { const hay = [i.client, i.invoiceNo, i.createdBy, i.notes].join(" ").toLowerCase(); if (!hay.includes(query.toLowerCase())) return false; }
    return true;
  });

  // ── numbers (admin) ─────────────────────────────────────────────────────────
  const approvedEst = estimates.filter((e) => e.status === "Approved");
  const estPipeline = approvedEst.reduce((s, e) => s + recTotals(e).total, 0);
  const invTotal = invoices.reduce((s, i) => s + recTotals(i).total, 0);
  const invPaid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + recTotals(i).total, 0);
  const invOutstanding = invTotal - invPaid;
  const invCost = invoices.reduce((s, i) => s + costOfLines(i.lines), 0);
  const invMargin = invoices.reduce((s, i) => s + recSub(i), 0) - invCost;

  // royalties: match each invoice's address back to the rep who walked it in the outreach app
  const royaltyRows = invoices.map((i) => {
    const rep = matchOutreachRep(i.address, outreachVisits);
    const total = recTotals(i).total;
    return { i, rep, total, royalty: total * ROYALTY_RATE, vested: isVested(i), daysLeft: vestDaysLeft(i) };
  });
  const vestedUnsynced = royaltyRows.filter((r) => r.rep && r.vested && !r.i.pushedToOutreach);
  const royaltyByRep = Array.from(new Set(royaltyRows.filter((r) => r.rep).map((r) => r.rep))).sort().map((rep) => {
    const rows = royaltyRows.filter((r) => r.rep === rep);
    return { rep, rows, vestedOwed: rows.filter((r) => r.vested).reduce((s, r) => s + r.royalty, 0), pendingOwed: rows.filter((r) => !r.vested).reduce((s, r) => s + r.royalty, 0) };
  });

  const estTotals = recTotals(estForm);
  const invTotals = recTotals(invForm);

  return (
    <div className={"fl-root" + (theme === "dark" ? " so-dark" : "")}>
      <div className="fl-noprint">
      <header className="fl-header">
        <div className="fl-wordmark">
          <span className="fl-logo"><img src={LOGO} alt="ReyGuild" /></span>
          <span className="fl-brandtext">
            <span className="fl-brandname"><span className="fl-rey">Rey</span><span className="fl-guild">Guild</span></span>
            <span className="fl-tagline">Estimating &amp; Invoicing</span>
          </span>
        </div>
        <div className="fl-stats">
          <label className="fl-actas">
            <select value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)}>
              <option value="">{profile.name ? profile.name + " (Owner)" : "Owner"}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="fl-rolebadge" style={{ "--accent": ROLE_COLOR[role] || "var(--ink-2)" }}>{role}</span>
          </label>
          <div className="fl-chip" onClick={() => setPage("estimates")} style={{ cursor: "pointer" }}><span className="fl-chip-num">{myEstimates.length}</span><span className="fl-chip-lbl">estimates</span></div>
          <div className="fl-chip" onClick={() => setPage("invoices")} style={{ cursor: "pointer" }}><span className="fl-chip-num">{myInvoices.length}</span><span className="fl-chip-lbl">invoices</span></div>
          <div className={"fl-chip" + (fuDueList.length ? " due" : "")} onClick={() => setPage("followups")} style={{ cursor: "pointer" }}><span className="fl-chip-num">{fuDueList.length}</span><span className="fl-chip-lbl">follow-ups</span></div>
          {isAdmin && <div className={"fl-chip" + ((pendingPayouts.length + lateFollowups.length + collectionsDue.length + approvalNotices.length) ? " alert" : "")} onClick={() => setPage("alerts")} style={{ cursor: "pointer" }}><span className="fl-chip-num">{pendingPayouts.length + lateFollowups.length + collectionsDue.length + approvalNotices.length}</span><span className="fl-chip-lbl">approvals</span></div>}
          <div className={"fl-chip" + (unreadMsgs ? " alert" : "")} onClick={() => setPage("messages")} style={{ cursor: "pointer" }}><span className="fl-chip-num">{unreadMsgs}</span><span className="fl-chip-lbl">messages</span></div>
        </div>
      </header>

      {isAdmin && collectionsDue.length > 0 && (
        <div className="so-banner" onClick={() => setPage("alerts")}>
          ⚠ {collectionsDue.length} invoice{collectionsDue.length === 1 ? "" : "s"} still unpaid {COLLECT_AFTER_DAYS}+ days after the past-due notice — time to call the client. Tap to review.
        </div>
      )}

      <nav className="fl-nav3">
        {(() => {
          const menuTabs = TABS.filter((t) => t.key !== "messages" && t.key !== "settings");
          const here = menuTabs.find((t) => t.key === page);
          return (
            <div className="fl-menuwrap">
              <button className={"fl-menubtn" + (here ? " on" : "")} onClick={() => setNavOpen(!navOpen)}>
                <span className="fl-menu-ic">☰</span> {here ? here.label : "Menu"} <span className="fl-menu-car">▾</span>
              </button>
              {navOpen && <div className="fl-menu-overlay" onClick={() => setNavOpen(false)} />}
              {navOpen && (
                <div className="fl-menu">
                  {menuTabs.map((t) => (
                    <button key={t.key} className={"fl-menu-item" + (page === t.key ? " on" : "")} onClick={() => { setPage(t.key); setQuery(""); setNavOpen(false); }}>{t.label}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        <button className={"fl-midtab" + (page === "messages" ? " on" : "")} onClick={() => { setPage("messages"); setNavOpen(false); }}>Messages{unreadMsgs ? " (" + unreadMsgs + ")" : ""}</button>
        <button className={"fl-righttab" + (page === "settings" ? " on" : "")} onClick={() => { setPage("settings"); setQuery(""); setNavOpen(false); }}>Settings</button>
      </nav>

      {/* ════════════════════ ESTIMATES ════════════════════ */}
      {page === "estimates" && (
        <div className="fl-grid">
          <section className="fl-panel" ref={formRef}>
            <div className="fl-panel-head"><h2>{estForm.id ? "Edit estimate" : "New estimate"}</h2></div>
            <div className="fl-form">
              <div className="fl-two">
                <Field label="Estimate #"><input value={estForm.estimateNo} placeholder="EST-1001" onChange={(e) => setEstForm({ ...estForm, estimateNo: e.target.value })} /></Field>
                <Field label="Date"><input type="date" value={estForm.date} onChange={(e) => setEstForm({ ...estForm, date: e.target.value })} /></Field>
              </div>
              {can.seeAllWork ? (
                <Field label="Client">
                  <input list="so-clients" value={estForm.client} placeholder="Pick or type a client" onChange={(e) => setEstForm({ ...estForm, client: e.target.value })} />
                </Field>
              ) : (() => {
                const hit = matchContact(estForm.client, estForm.clientAddr);
                return (
                  <>
                    <Field label="Contact full name"><input value={estForm.client} placeholder="e.g. Riverside Auto Body" onChange={(e) => setEstForm({ ...estForm, client: e.target.value })} /></Field>
                    <Field label="Full address"><input value={estForm.clientAddr} placeholder="e.g. 410 N Main St, Fort Gibson OK" onChange={(e) => setEstForm({ ...estForm, clientAddr: e.target.value })} /></Field>
                    {estForm.client.trim() && estForm.clientAddr.trim() && (
                      hit
                        ? <div className="so-match"><span className="so-match-ok">✓ Existing contact found</span><button type="button" className="fl-link" onClick={() => setEstForm({ ...estForm, client: hit.company, clientAddr: hit.address })}>Use it</button></div>
                        : <div className="so-match"><span className="so-match-new">New contact — it'll be added when you save</span></div>
                    )}
                  </>
                );
              })()}
              {role !== "Estimator" && (
                <Field label="Estimator (gets the credit)">
                  <input list="so-reps" value={estForm.createdBy} placeholder="Who built this" onChange={(e) => setEstForm({ ...estForm, createdBy: e.target.value })} />
                </Field>
              )}

              <Field label="Job description"><textarea rows={3} value={estForm.jobDescription} placeholder="Describe the job in plain language — what you'll do and what's included." onChange={(e) => setEstForm({ ...estForm, jobDescription: e.target.value })} /></Field>
              <p className="fl-hint">Build it as a priced-out sheet: write the job description, then add each item from the price list as its own line (include labor as a line too). Your one-year warranty and service agreement are attached to every estimate automatically.</p>

              <p className="fl-sub">How to price this</p>
              <Seg value={estForm.mode === "lumpsum" ? "One price + description" : "Itemized"} options={["Itemized", "One price + description"]} onChange={(v) => setEstForm({ ...estForm, mode: v === "Itemized" ? "itemized" : "lumpsum" })} />

              {estForm.mode === "lumpsum" ? (
                <>
                  <Field label="Description (what the job covers)"><textarea rows={5} value={estForm.lumpDescription} placeholder="Describe the full scope here — materials and labor — in plain language." onChange={(e) => setEstForm({ ...estForm, lumpDescription: e.target.value })} /></Field>
                  <Field label="Price ($)"><input value={estForm.lumpPrice} inputMode="decimal" placeholder="0.00" onChange={(e) => setEstForm({ ...estForm, lumpPrice: e.target.value })} /></Field>
                </>
              ) : (
                <>
                  <p className="fl-hint">Pick from the price list and the unit price fills in. Adjust the quantity; change the price only if there's a reason.</p>
                  {estForm.lines.map((l) => (
                    <div className="so-line" key={l.id}>
                      <input className="so-line-name" list="so-items" value={l.name} placeholder="Item / material" onChange={(e) => pickItem(estForm, setEstForm, l.id, e.target.value)} />
                      <input className="so-line-qty" inputMode="decimal" value={l.qty} placeholder="Qty" onChange={(e) => setLine(estForm, setEstForm, l.id, "qty", e.target.value)} />
                      <input className="so-line-price" inputMode="decimal" value={l.unitPrice} placeholder="Unit $" onChange={(e) => setLine(estForm, setEstForm, l.id, "unitPrice", e.target.value)} />
                      <span className="so-line-amt">{money(lineTotal(l))}</span>
                      <button className="so-line-x" onClick={() => removeLine(estForm, setEstForm, l.id)} aria-label="remove line">×</button>
                    </div>
                  ))}
                  <button className="fl-job-btn" style={{ width: "100%", marginTop: 4 }} onClick={() => addLine(estForm, setEstForm)}>+ Add line</button>
                </>
              )}

              <div className="so-totals">
                {TAX_RATE > 0 && <div><span>Subtotal</span><span>{money(estTotals.sub)}</span></div>}
                {TAX_RATE > 0 && <div><span>{TAX_LABEL} ({Math.round(TAX_RATE * 1000) / 10}%)</span><span>{money(estTotals.tax)}</span></div>}
                <div className="so-totals-grand"><span>Total</span><span>{money(estTotals.total)}</span></div>
                {can.seeNumbers && estForm.mode !== "lumpsum" && <div className="so-totals-margin"><span>Est. margin</span><span>{money(estTotals.sub - costOfLines(estForm.lines))}</span></div>}
              </div>

              <Field label="Scope / notes"><textarea rows={3} value={estForm.notes} placeholder="What's included, exclusions, access notes…" onChange={(e) => setEstForm({ ...estForm, notes: e.target.value })} /></Field>
              <label className="so-legal-toggle"><input type="checkbox" checked={estForm.attachLegal !== false} onChange={(e) => setEstForm({ ...estForm, attachLegal: e.target.checked })} /> Attach the warranty &amp; contract to this estimate</label>
              <Field label="Photos">
                <div className="so-photo-btns">
                  <label className="fl-job-btn">📷 Take a picture<input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files, setEstForm); e.target.value = ""; }} /></label>
                  <label className="fl-job-btn">🖼 Add from gallery<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files, setEstForm); e.target.value = ""; }} /></label>
                </div>
                {(estForm.photos || []).length > 0 && (
                  <div className="so-photos">{estForm.photos.map((p, idx) => <div className="so-photo" key={idx}><img src={p} alt="" /><button type="button" onClick={() => removePhoto(setEstForm, idx)}>×</button></div>)}</div>
                )}
              </Field>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions">
                <button className="fl-primary" onClick={() => saveEstimate("Draft")}>{estForm.id ? "Save" : "Save draft"}</button>
                <button className="fl-ghost" onClick={() => saveEstimate("Submitted")}>Submit</button>
                {estForm.id && <button className="fl-ghost" onClick={() => { setEstForm(emptyEstimate()); setErr(""); }}>Cancel</button>}
              </div>
            </div>
          </section>

          <section className="fl-list">
            <div className="fl-toolbar">
              <input className="fl-search" value={query} placeholder="Search client, estimate #, estimator…" onChange={(e) => setQuery(e.target.value)} />
              <div className="fl-filters">
                {["All", "Pending", "Approved", "Declined", "Cleared"].map((f) => <button key={f} className={"fl-pill" + (estFilter === f ? " active" : "")} onClick={() => setEstFilter(f)}>{f}</button>)}
              </div>
            </div>
            {loading ? <div className="fl-empty">Loading…</div> : shownEstimates.length === 0 ? (
              <div className="fl-empty">{myEstimates.length === 0 ? "No estimates yet. Build your first one with the form." : "Nothing matches that filter."}</div>
            ) : (
              <div className="fl-cards">
                {shownEstimates.map((e) => {
                  const t = recTotals(e);
                  return (
                    <article key={e.id} className="fl-card" style={{ "--accent": EST_COLOR[e.status] || "var(--ink-2)" }}>
                      <div className="fl-card-top">
                        <div>
                          <h3>{e.client || "(no client)"}</h3>
                          <p className="fl-addr">{e.estimateNo ? "#" + e.estimateNo + " · " : ""}{fmtDate(e.date)}</p>
                        </div>
                        <span className="fl-status">{e.status}</span>
                      </div>
                      <div className="fl-meta">
                        <span><strong>{money(t.total)}</strong></span>
                        <span>{e.mode === "lumpsum" ? "lump sum" : (e.lines || []).length + " line" + ((e.lines || []).length === 1 ? "" : "s")}</span>
                        {e.invoiced && <span className="fl-paychip">invoiced ✓</span>}
                        {can.seeNumbers && e.mode !== "lumpsum" && <span className="fl-paychip">margin {money(t.sub - costOfLines(e.lines))}</span>}
                      </div>
                      {e.mode === "lumpsum" && e.lumpDescription && <p className="fl-notes">{e.lumpDescription}</p>}
                      {e.sentAt && (() => {
                        const n = fuNext(e); const due = fuDueStep(e);
                        if (!fuActive(e) || !n) return <p className="fl-addr">Sent to client {fmtDate(e.sentAt)} · follow-ups {e.fuStopped ? "stopped" : "complete"}</p>;
                        return <p className={"fl-addr" + (due ? " so-fu-due" : "")}>Sent {fmtDate(e.sentAt)} · next: {n.kind === "call" ? "📞 " : "✉ "}{n.label} {due ? (n.overdueDays > 0 ? "· " + n.overdueDays + "d overdue" : "· due now") : "· " + fmtDate(toLocalDate(new Date(n.dueTs)))}</p>;
                      })()}
                      {e.notes && <p className="fl-notes">{e.notes}</p>}
                      <div className="fl-card-foot">
                        <span className="fl-stamp">{e.createdBy ? "By " + e.createdBy : "No estimator"}</span>
                        <div className="fl-card-actions">
                          <button className="fl-link" onClick={() => editEstimate(e)}>Edit</button>
                          <button className="fl-link" onClick={() => setPreviewFor(previewFor === e.id ? null : e.id)}>{previewFor === e.id ? "Hide preview" : "Preview"}</button>
                          {clientOf(e.client)?.email
                            ? <a className="fl-link" href={sendDocMailto(e, "estimate")}>Email to client</a>
                            : (emailPromptFor === e.id
                                ? <span className="so-email-prompt"><input value={emailDraft} placeholder="client@email.com" onChange={(ev) => setEmailDraft(ev.target.value)} /><button className="fl-link" onClick={() => saveClientEmail(e)}>Save &amp; send</button></span>
                                : <button className="fl-link" onClick={() => { setEmailPromptFor(e.id); setEmailDraft(""); }}>Email to client</button>)}
                          {(profile.email || (currentUser && currentUser.email)) && <a className="fl-link" href={sendDocMailto(e, "estimate", true)}>Email me</a>}
                          {can.approve && e.status === "Submitted" && <button className="fl-link" onClick={() => setEstStatus(e.id, "Approved")}>Approve</button>}
                          {can.approve && e.status === "Submitted" && <button className="fl-link danger" onClick={() => setEstStatus(e.id, "Declined")}>Decline</button>}
                          {(can.seeAllWork || (e.createdBy || "").trim() === myName) && e.status === "Approved" && !e.invoiced && <button className="fl-link" onClick={() => convertToInvoice(e)}>→ Invoice</button>}
                          {!e.sentAt && <button className="fl-link" onClick={() => markSentToClient(e.id)}>Sent to client</button>}
                          {e.archived
                            ? <button className="fl-link" onClick={() => archiveEstimate(e.id, false)}>Restore</button>
                            : <button className="fl-link" onClick={() => archiveEstimate(e.id, true)}>Clear from list</button>}
                          {confirmId === e.id ? (
                            <><button className="fl-link danger" onClick={() => removeEstimate(e.id)}>Delete</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                          ) : <button className="fl-link" onClick={() => setConfirmId(e.id)}>Remove</button>}
                          {e.status !== "Approved" && <button className="fl-link" onClick={() => setSignFor(signFor === e.id ? null : e.id)}>✍ Client sign-off</button>}
                        </div>
                      </div>
                      {previewFor === e.id && (
                        <div className="so-preview">
                          <p className="so-preview-lbl">Preview — what the client receives</p>
                          <pre className="so-legal">{docBodyText(e, "estimate")}</pre>
                          {(e.photos || []).length > 0 && <div className="so-photos">{e.photos.map((p, idx) => <img className="so-photo-view" key={idx} src={p} alt="" />)}</div>}
                        </div>
                      )}
                      {e.signedAt && e.signature && (
                        <div className="so-signed"><span className="so-signed-lbl">Signed & approved {fmtDate(e.signedAt)}{e.signedName ? " — " + e.signedName : ""}</span><img className="so-signed-img" src={e.signature} alt="signature" /></div>
                      )}
                      {signFor === e.id && (
                        <SignaturePad
                          client={e.client}
                          onApprove={(name, sig) => signEstimate(e, name, sig)}
                          onThink={() => clientThinking(e)}
                          onDecline={() => declineByClient(e)}
                          onCancel={() => setSignFor(null)}
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════ INVOICES ════════════════════ */}
      {page === "invoices" && (
        <div className="fl-grid">
          <section className="fl-panel" ref={formRef}>
            <div className="fl-panel-head"><h2>{invForm.id ? "Edit invoice" : "New invoice"}</h2></div>
            <div className="fl-form">
              {invForm.fromEstimate && <p className="fl-match ok" style={{ marginTop: 0 }}>From estimate <strong>{invForm.fromEstimate}</strong></p>}
              <div className="fl-two">
                <Field label="Invoice #"><input value={invForm.invoiceNo} placeholder="INV-1042" onChange={(e) => setInvForm({ ...invForm, invoiceNo: e.target.value })} /></Field>
                <Field label="Date"><input type="date" value={invForm.date} onChange={(e) => setInvForm({ ...invForm, date: e.target.value })} /></Field>
                <Field label="Payment due date">
                  <div className="so-due-row">
                    <input type="date" value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} />
                    <button type="button" className="fl-link" onClick={() => { const base = new Date((invForm.date || toLocalDate(new Date())) + "T00:00:00"); base.setDate(base.getDate() + NET_DAYS); setInvForm({ ...invForm, dueDate: toLocalDate(base) }); }}>Net {NET_DAYS}</button>
                  </div>
                </Field>
              </div>
              <Field label="Client"><input list="so-clients" value={invForm.client} placeholder="Pick or type a client" onChange={(e) => { const name = e.target.value; const c = clientOf(name); setInvForm((f) => ({ ...f, client: name, address: (!f.address && c) ? (c.address || "") : f.address })); }} /></Field>
              <Field label="Job address (links to outreach royalties)"><input list="so-addrs" value={invForm.address} placeholder="123 Industrial Rd — where the work was done" onChange={(e) => setInvForm({ ...invForm, address: e.target.value })} /></Field>
              {role !== "Estimator" && (
                <Field label="Submitted by"><input list="so-reps" value={invForm.createdBy} placeholder="Who's invoicing" onChange={(e) => setInvForm({ ...invForm, createdBy: e.target.value })} /></Field>
              )}

              <p className="fl-sub">How to bill this</p>
              <Seg value={invForm.mode === "lumpsum" ? "One price + description" : "Itemized"} options={["Itemized", "One price + description"]} onChange={(v) => setInvForm({ ...invForm, mode: v === "Itemized" ? "itemized" : "lumpsum" })} />

              {invForm.mode === "lumpsum" ? (
                <>
                  <Field label="Description (what was done)"><textarea rows={5} value={invForm.lumpDescription} placeholder="Describe the work billed — materials and labor — in plain language." onChange={(e) => setInvForm({ ...invForm, lumpDescription: e.target.value })} /></Field>
                  <Field label="Price ($)"><input value={invForm.lumpPrice} inputMode="decimal" placeholder="0.00" onChange={(e) => setInvForm({ ...invForm, lumpPrice: e.target.value })} /></Field>
                </>
              ) : (
                <>
                  {invForm.lines.map((l) => (
                    <div className="so-line" key={l.id}>
                      <input className="so-line-name" list="so-items" value={l.name} placeholder="Item / material" onChange={(e) => pickItem(invForm, setInvForm, l.id, e.target.value)} />
                      <input className="so-line-qty" inputMode="decimal" value={l.qty} placeholder="Qty" onChange={(e) => setLine(invForm, setInvForm, l.id, "qty", e.target.value)} />
                      <input className="so-line-price" inputMode="decimal" value={l.unitPrice} placeholder="Unit $" onChange={(e) => setLine(invForm, setInvForm, l.id, "unitPrice", e.target.value)} />
                      <span className="so-line-amt">{money(lineTotal(l))}</span>
                      <button className="so-line-x" onClick={() => removeLine(invForm, setInvForm, l.id)} aria-label="remove line">×</button>
                    </div>
                  ))}
                  <button className="fl-job-btn" style={{ width: "100%", marginTop: 4 }} onClick={() => addLine(invForm, setInvForm)}>+ Add line</button>
                </>
              )}

              <div className="so-totals">
                {TAX_RATE > 0 && <div><span>Subtotal</span><span>{money(invTotals.sub)}</span></div>}
                {TAX_RATE > 0 && <div><span>{TAX_LABEL} ({Math.round(TAX_RATE * 1000) / 10}%)</span><span>{money(invTotals.tax)}</span></div>}
                <div className="so-totals-grand"><span>Total</span><span>{money(invTotals.total)}</span></div>
                {can.seeNumbers && invForm.mode !== "lumpsum" && <div className="so-totals-margin"><span>Margin</span><span>{money(invTotals.sub - costOfLines(invForm.lines))}</span></div>}
              </div>

              <Field label="Notes"><textarea rows={2} value={invForm.notes} placeholder="Terms, PO #, payment notes…" onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} /></Field>
              <Field label="Photos">
                <div className="so-photo-btns">
                  <label className="fl-job-btn">📷 Take a picture<input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files, setInvForm); e.target.value = ""; }} /></label>
                  <label className="fl-job-btn">🖼 Add from gallery<input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { handlePhotos(e.target.files, setInvForm); e.target.value = ""; }} /></label>
                </div>
                {(invForm.photos || []).length > 0 && (
                  <div className="so-photos">{invForm.photos.map((p, idx) => <div className="so-photo" key={idx}><img src={p} alt="" /><button type="button" onClick={() => removePhoto(setInvForm, idx)}>×</button></div>)}</div>
                )}
              </Field>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions">
                <button className="fl-primary" onClick={() => saveInvoice("Draft")}>{invForm.id ? "Save" : "Save draft"}</button>
                <button className="fl-ghost" onClick={() => saveInvoice("Sent")}>Mark sent</button>
                {invForm.id && <button className="fl-ghost" onClick={() => { setInvForm(emptyInvoice()); setErr(""); }}>Cancel</button>}
              </div>
            </div>
          </section>

          <section className="fl-list">
            <div className="fl-toolbar">
              <input className="fl-search" value={query} placeholder="Search client, invoice #, person…" onChange={(e) => setQuery(e.target.value)} />
              <div className="fl-filters">
                {["All", ...INV_STATUSES, "Archived"].map((f) => <button key={f} className={"fl-pill" + (invFilter === f ? " active" : "")} onClick={() => setInvFilter(f)}>{f}</button>)}
              </div>
            </div>
            {loading ? <div className="fl-empty">Loading…</div> : shownInvoices.length === 0 ? (
              <div className="fl-empty">{myInvoices.length === 0 ? "No invoices yet. Build one, or approve an estimate and convert it." : "Nothing matches that filter."}</div>
            ) : (
              <div className="fl-cards">
                {shownInvoices.map((i) => {
                  const t = recTotals(i);
                  return (
                    <article key={i.id} className="fl-card" style={{ "--accent": INV_COLOR[i.status] || "var(--ink-2)" }}>
                      <div className="fl-card-top">
                        <div>
                          <h3>{i.client || "(no client)"}</h3>
                          <p className="fl-addr">{i.invoiceNo ? "#" + i.invoiceNo + " · " : ""}{fmtDate(i.date)}</p>
                        </div>
                        <span className="fl-status">{i.status}</span>
                      </div>
                      <div className="fl-meta">
                        <span><strong>{money(t.total)}</strong></span>
                        <span>{i.mode === "lumpsum" ? "lump sum" : (i.lines || []).length + " line" + ((i.lines || []).length === 1 ? "" : "s")}</span>
                        {can.seeNumbers && i.mode !== "lumpsum" && <span className="fl-paychip">margin {money(t.sub - costOfLines(i.lines))}</span>}
                      </div>
                      {i.mode === "lumpsum" && i.lumpDescription && <p className="fl-notes">{i.lumpDescription}</p>}
                      {can.seeNumbers && i.address && (() => {
                        const rep = matchOutreachRep(i.address, outreachVisits);
                        if (!rep) return null;
                        return <p className="fl-addr">Outreach: <strong>{rep}</strong> · royalty {money(t.total * ROYALTY_RATE)} · {isVested(i) ? (i.pushedToOutreach ? "✓ sent to outreach" : "vested — ready") : vestDaysLeft(i) + "d to vest"}</p>;
                      })()}
                      {i.notes && <p className="fl-notes">{i.notes}</p>}
                      {(() => {
                        const paid = invPaidAmt(i); const bal = invBalance(i);
                        if (paid <= 0) return null;
                        return (
                          <div className="so-pay-summary">
                            <span className={"so-pay-state" + (bal <= 0.005 ? " done" : "")}>{bal <= 0.005 ? "✓ Paid in full" : "Partial — " + money(bal) + " left"}</span>
                            <span className="so-pay-sub">Paid {money(paid)} of {money(t.total)}</span>
                          </div>
                        );
                      })()}
                      {(i.payments || []).length > 0 && (
                        <div className="so-pay-list">
                          {i.payments.map((p) => (
                            <div className="so-pay-row" key={p.id}>
                              <span>{fmtDate(p.date)} · {p.method}</span>
                              <span>{money(p.amount)}</span>
                              <button className="fl-link" onClick={() => removePayment(i.id, p.id)}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {payFor === i.id && (
                        <div className="so-pay-form">
                          <div className="so-pay-fields">
                            <input className="so-pay-amt" inputMode="decimal" value={payDraft.amount} placeholder={"Amount (bal " + money(invBalance(i)) + ")"} onChange={(e) => setPayDraft({ ...payDraft, amount: e.target.value })} />
                            <select value={payDraft.method} onChange={(e) => setPayDraft({ ...payDraft, method: e.target.value })}>{PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                            {payDraft.method === "Other" && <input value={payDraft.methodOther} placeholder="Type method" onChange={(e) => setPayDraft({ ...payDraft, methodOther: e.target.value })} />}
                            <input type="date" value={payDraft.date} onChange={(e) => setPayDraft({ ...payDraft, date: e.target.value })} />
                          </div>
                          <div className="so-pay-actions">
                            <button className="fl-primary" onClick={() => recordPayment(i)}>Log payment</button>
                            <button className="fl-link" onClick={() => setPayDraft({ ...payDraft, amount: String(invBalance(i)) })}>Pay full balance</button>
                            <button className="fl-ghost" onClick={() => setPayFor(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {i.dueDate && invBalance(i) > 0.005 && (
                        <p className={"so-due-stamp" + (isPastDue(i) ? " over" : "")}>{isPastDue(i) ? "⚠ Past due — was due " + fmtDate(i.dueDate) : "Due " + fmtDate(i.dueDate)}{i.overdueEmailSent ? " · past-due notice sent " + fmtDate(i.overdueEmailSentAt) : ""}</p>
                      )}
                      <div className="fl-card-foot">
                        <span className="fl-stamp">{i.createdBy ? "By " + i.createdBy : "No estimator"}</span>
                        <div className="fl-card-actions">
                          <button className="fl-link" onClick={() => editInvoice(i)}>Edit</button>
                          <button className="fl-link" onClick={() => setPreviewFor(previewFor === i.id ? null : i.id)}>{previewFor === i.id ? "Hide preview" : "Preview"}</button>
                          {clientOf(i.client)?.email
                            ? <a className="fl-link" href={sendDocMailto(i, "invoice")}>Email to client</a>
                            : (emailPromptFor === i.id
                                ? <span className="so-email-prompt"><input value={emailDraft} placeholder="client@email.com" onChange={(ev) => setEmailDraft(ev.target.value)} /><button className="fl-link" onClick={() => saveClientEmail(i)}>Save &amp; send</button></span>
                                : <button className="fl-link" onClick={() => { setEmailPromptFor(i.id); setEmailDraft(""); }}>Email to client</button>)}
                          {(profile.email || (currentUser && currentUser.email)) && <a className="fl-link" href={sendDocMailto(i, "invoice", true)}>Email me</a>}
                          {i.status !== "Sent" && i.status !== "Paid" && <button className="fl-link" onClick={() => setInvStatus(i.id, "Sent")}>Sent</button>}
                          {isPastDue(i) && clientOf(i.client)?.email && <a className="fl-link danger" href={overdueMailto(i)} onClick={() => markOverdueSent(i)}>Send past-due notice</a>}
                          {invBalance(i) > 0.005 && <button className="fl-link" onClick={() => { setPayFor(payFor === i.id ? null : i.id); setPayDraft({ amount: "", method: "Card", methodOther: "", date: toLocalDate(new Date()) }); }}>＋ Record payment</button>}
                          {i.status === "Paid" && !i.archived && <button className="fl-link" onClick={() => archiveInvoice(i.id, true)}>Archive (done)</button>}
                          {i.archived && <button className="fl-link" onClick={() => archiveInvoice(i.id, false)}>Unarchive</button>}
                          {confirmId === i.id ? (
                            <><button className="fl-link danger" onClick={() => removeInvoice(i.id)}>Delete</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                          ) : <button className="fl-link" onClick={() => setConfirmId(i.id)}>Remove</button>}
                        </div>
                      </div>
                      {previewFor === i.id && (
                        <div className="so-preview">
                          <p className="so-preview-lbl">Preview — what the client receives</p>
                          <pre className="so-legal">{docBodyText(i, "invoice")}</pre>
                          {(i.photos || []).length > 0 && <div className="so-photos">{i.photos.map((p, idx) => <img className="so-photo-view" key={idx} src={p} alt="" />)}</div>}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════ FOLLOW-UPS ════════════════════ */}
      {page === "followups" && (
        <div className="fl-weekly">
          <div className="so-banner-info">THIS IS YOUR AUTOMATIC FOLLOW-UP SEQUENCE. BEFORE IT CAN BEGIN, MAKE SURE EACH CLIENT'S PHONE NUMBER AND EMAIL ARE ON FILE — THE CALLS AND EMAILS CANNOT GO OUT WITHOUT THEM.</div>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 14 }}>
            Mark an estimate “Sent to client” and the follow-up sequence lines up: a <strong>phone-call reminder on day {FOLLOWUP_STEPS[0].afterDays}</strong>, an automatic <strong>Follow-up 1 email on day {FOLLOWUP_STEPS[1].afterDays}</strong>, an automatic <strong>Follow-up 2 email on day {FOLLOWUP_STEPS[2].afterDays}</strong>, then a <strong>phone-call reminder on day {FOLLOWUP_STEPS[3].afterDays}</strong>. The calls are assigned to the estimator who owns it. The day-{FOLLOWUP_STEPS[1].afterDays} and day-{FOLLOWUP_STEPS[2].afterDays} emails are written and ready — once email sending is connected they go out on their own; until then they appear here as one-tap sends. {can.seeAllWork ? "You see the whole team's." : "You see your own."}
          </p>

          <p className="fl-sub" style={{ marginTop: 0 }}>Due now · {fuDueList.length}</p>
          {fuDueList.length === 0 ? <div className="fl-empty">Nothing due. Reminders appear here on their day.</div> : fuDueList.map(({ e, step }) => {
            const c = clientOf(e.client);
            return (
              <div className="fl-job flag" key={e.id} style={{ "--accent": "var(--red)" }}>
                <div className="fl-job-top">
                  <div>
                    <h3>{e.client || "(no client)"}</h3>
                    <p className="fl-addr">{e.estimateNo ? "#" + e.estimateNo + " · " : ""}{money(recTotals(e).total)} · sent {fmtDate(e.sentAt)}</p>
                  </div>
                  <div className="fl-job-right">
                    <span className="fl-status" style={{ background: step.kind === "call" ? "var(--amber-deep)" : "var(--blue)" }}>{step.kind === "call" ? "Phone call" : "Email"}</span>
                    <span className="fl-flag">⚑ {step.overdueDays > 0 ? step.overdueDays + "d overdue" : "due today"}</span>
                  </div>
                </div>
                <p className="fl-next"><strong>{step.label}</strong> — for {e.createdBy || "the estimator"}</p>
                {step.kind === "call"
                  ? <p className="fl-notes">📞 Call {c && c.contact ? c.contact : "the client"}{c && c.phone ? " at " + c.phone : " — no phone on file, check the client record"}.</p>
                  : <p className="fl-notes">✉ Remind {c && c.email ? c.email : "the client — no email on file, add it on the Clients tab"}.</p>}
                <div className="fl-job-foot">
                  {step.kind === "call" ? (
                    <div className="so-outcome">
                      <label className="so-outcome-date">Call date
                        <input type="date" value={callDate[e.id] || toLocalDate(new Date())} onChange={(ev) => setCallDate((m) => ({ ...m, [e.id]: ev.target.value }))} />
                      </label>
                      <div className="so-outcome-btns">
                        <button className="fl-job-btn ok" onClick={() => logCallOutcome(e, "approved")}>Approved</button>
                        <button className="fl-job-btn" onClick={() => logCallOutcome(e, "deciding")}>Still deciding</button>
                        <button className="fl-job-btn danger" onClick={() => logCallOutcome(e, "lost")}>Went with someone else</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {c && c.email && <a className="fl-job-btn" href={reminderMailto(e, step.idx === 1 ? 1 : 2)}>✉ Open {step.idx === 1 ? "Follow-up 1" : "Follow-up 2"} email</a>}
                      <button className="fl-link" onClick={() => copyReminder(e, step.idx === 1 ? 1 : 2)}>Copy text</button>
                      <button className="fl-job-btn" onClick={() => advanceFu(e.id)}>Mark sent ✓</button>
                      <button className="fl-link danger" onClick={() => stopFu(e.id)}>Got a response — stop</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <p className="fl-sub">Scheduled · {fuUpcoming.length}</p>
          {fuUpcoming.length === 0 ? <div className="fl-empty">No reminders lined up. Mark an approved estimate “Sent to client” to start the clock.</div> : (
            <div className="fl-emp-card">
              {fuUpcoming.map(({ e, step }) => (
                <div className="fl-emp-row" key={e.id}>
                  <span className="fl-emp-co">{step.kind === "call" ? "📞 " : "✉ "}{e.client || "(no client)"}</span>
                  <span className="fl-emp-tags">{step.label} · {fmtDate(toLocalDate(new Date(step.dueTs)))} · {e.createdBy || "—"}</span>
                </div>
              ))}
            </div>
          )}

          <p className="fl-sub" style={{ marginTop: 18 }}>Review requests · {reviewDue.length}</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 10 }}>Three days after an invoice is sent, a thank-you / review-request email is ready for the client.</p>
          {reviewDue.length === 0 ? <div className="fl-empty">No review requests due. They appear 3 days after an invoice is marked “Sent.”</div> : (
            reviewDue.map((i) => {
              const c = clientOf(i.client);
              return (
                <div className="fl-job flag" key={i.id} style={{ "--accent": "var(--green)" }}>
                  <div className="fl-job-top">
                    <div>
                      <h3>⭐ Review request — {i.client || "(no client)"}</h3>
                      <p className="fl-addr">Invoice{i.invoiceNo ? " #" + i.invoiceNo : ""} · sent {fmtDate(i.sentAt)}</p>
                    </div>
                  </div>
                  <div className="fl-job-foot">
                    {c && c.email && <a className="fl-job-btn" href={reviewMailto(i)}>✉ Open review email</a>}
                    <button className="fl-link" onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(reviewBody(i)); setErr("Review text copied."); } catch (x) {} }}>Copy text</button>
                    <button className="fl-job-btn" onClick={() => markReviewSent(i.id)}>Mark sent ✓</button>
                  </div>
                </div>
              );
            })
          )}

          <p className="fl-foot-note">Heads-up on automation: a browser app can’t send email on its own or alert you while it’s closed. This schedules the cadence, flags what’s due whenever you open it, and gives you a one-click pre-filled reminder email. Truly hands-off sending plus push/text alerts need a backend with an email/SMS service — that’s the piece to add when this goes live.</p>
        </div>
      )}

      {/* ════════════════════ CLIENTS ════════════════════ */}
      {page === "clients" && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>{clientForm.id ? "Edit client" : "Add client"}</h2></div>
            <div className="fl-form">
              {can.importExport && (
                <>
                  <input type="file" accept=".csv,text/csv" ref={cliFileRef} onChange={onClientCsv} style={{ display: "none" }} />
                  <div className="fl-actions" style={{ marginBottom: 6 }}>
                    <button className="fl-job-btn" style={{ flex: 1 }} onClick={() => cliFileRef.current && cliFileRef.current.click()}>⬆ Import CSV</button>
                    <button className="fl-job-btn" style={{ flex: 1 }} onClick={exportClientsCsv}>⬇ Export CSV</button>
                  </div>
                  <p className="fl-hint">Bulk import/export of the client list — Owner &amp; Admin only. Export downloads everyone as a .csv; import loads a list in and skips anyone already here.</p>
                </>
              )}
              <Field label="Company"><input value={clientForm.company} placeholder="Acme Manufacturing" onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} /></Field>
              <div className="fl-two">
                <Field label="Contact"><input value={clientForm.contact} placeholder="Who you deal with" onChange={(e) => setClientForm({ ...clientForm, contact: e.target.value })} /></Field>
                <Field label="Phone"><input value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></Field>
              </div>
              <Field label="Email"><input value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></Field>
              <Field label="Address"><input value={clientForm.address} placeholder="Job site / billing address" onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} /></Field>
              <Field label="Notes"><textarea rows={2} value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} /></Field>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions">
                <button className="fl-primary" onClick={saveClient}>{clientForm.id ? "Update client" : "Add client"}</button>
                {clientForm.id && <button className="fl-ghost" onClick={() => { setClientForm(emptyClient()); setErr(""); }}>Cancel</button>}
              </div>
            </div>
          </section>
          <section className="fl-list">
            <div className="fl-toolbar"><input className="fl-search" value={query} placeholder="Search clients…" onChange={(e) => setQuery(e.target.value)} /></div>
            {can.importExport && cliCsv && (
              <div className="fl-import">
                <div className="fl-import-head">
                  <strong>{cliCsv.fileName}</strong>
                  <span>{cliCsv.rows.length} rows — match the columns, then import</span>
                </div>
                {cliCsvErr && <p className="fl-error">{cliCsvErr}</p>}
                <div className="fl-map">
                  {[["company", "Company"], ["contact", "Contact"], ["phone", "Phone"], ["email", "Email"], ["address", "Address"], ["notes", "Notes"]].map(([k, label]) => (
                    <label key={k} className="fl-map-field">
                      <span>{label}{k === "company" ? " *" : ""}</span>
                      <select value={cliMap[k]} onChange={(e) => setCliMap((m) => ({ ...m, [k]: e.target.value }))}>
                        <option value="">— none —</option>
                        {cliCsv.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <table className="fl-prev">
                  <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Address</th></tr></thead>
                  <tbody>
                    {cliCsv.rows.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td className={cliMap.company ? "ok" : "no"}>{(cliMap.company && r[cliMap.company]) || "—"}</td>
                        <td>{(cliMap.contact && r[cliMap.contact]) || ""}</td>
                        <td>{(cliMap.email && r[cliMap.email]) || ""}</td>
                        <td>{(cliMap.address && r[cliMap.address]) || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cliCsv.rows.length > 6 && <p className="fl-hint">…and {cliCsv.rows.length - 6} more rows.</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={doClientImport}>Import clients</button>
                  <button className="fl-ghost" onClick={() => { setCliCsv(null); setCliCsvErr(""); }}>Cancel</button>
                </div>
              </div>
            )}
            {myClients.length === 0 ? <div className="fl-empty">{can.seeAllWork ? "No clients yet." : "None of your clients yet."}{can.importExport ? " Import a CSV above, or add one with the form" : " Add one with the form, or they're created automatically when you build an estimate"}{can.seeAllWork ? " — admins see the whole team's." : " — you only see your own."}</div> : (
              <div className="fl-cards">
                {myClients.filter((c) => !query.trim() || [c.company, c.contact, c.email, c.address].join(" ").toLowerCase().includes(query.toLowerCase())).map((c) => (
                  <article className="fl-person" key={c.id} style={{ "--accent": "var(--blue)" }}>
                    <div>
                      <h3>{c.company}</h3>
                      <p className="fl-pmeta">{[c.contact, c.phone, c.email].filter(Boolean).join(" · ") || "no contact details"}</p>
                      {c.address && <p className="fl-pmeta">{c.address}</p>}
                      {c.notes && <p className="fl-pmeta">{c.notes}</p>}
                    </div>
                    <div className="fl-card-actions">
                      <button className="fl-link" onClick={() => setClientForm({ ...emptyClient(), ...c })}>Edit</button>
                      {confirmId === c.id ? (
                        <><button className="fl-link danger" onClick={() => removeClient(c.id)}>Delete</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                      ) : <button className="fl-link" onClick={() => setConfirmId(c.id)}>Remove</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ════════════════════ PRICE LIST ════════════════════ */}
      {page === "prices" && (
        <div className={can.editPrices ? "fl-grid" : "fl-weekly"}>
          {can.editPrices && (
            <section className="fl-panel">
              <div className="fl-panel-head"><h2>{priceForm.id ? "Edit item" : "Add item"}</h2></div>
              <div className="fl-form">
                <Field label="Category"><input value={priceForm.category} placeholder="Labor, Materials…" onChange={(e) => setPriceForm({ ...priceForm, category: e.target.value })} /></Field>
                <Field label="Item / service"><input value={priceForm.name} placeholder="Standard labor (per hour)" onChange={(e) => setPriceForm({ ...priceForm, name: e.target.value })} /></Field>
                <Field label="Unit"><input value={priceForm.unit} placeholder="hr, ea, ft…" onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })} /></Field>
                <div className="fl-two">
                  <Field label="Price (customer)"><input value={priceForm.price} inputMode="decimal" placeholder="0.00" onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} /></Field>
                  <Field label="Cost (internal)"><input value={priceForm.cost} inputMode="decimal" placeholder="0.00" onChange={(e) => setPriceForm({ ...priceForm, cost: e.target.value })} /></Field>
                </div>
                <p className="fl-hint">Price is what estimators quote. Cost is internal — only Owner/Admin see it, and it drives the margin numbers.</p>
                {err && <p className="fl-error">{err}</p>}
                <div className="fl-actions">
                  <button className="fl-primary" onClick={savePriceItem}>{priceForm.id ? "Update item" : "Add item"}</button>
                  {priceForm.id && <button className="fl-ghost" onClick={() => { setPriceForm(emptyPriceItem()); setErr(""); }}>Cancel</button>}
                </div>
              </div>
            </section>
          )}
          <section className="fl-list">
            <div className="so-suppliers">
              <div className="so-sup-head">
                <span className="fl-sub" style={{ margin: 0, border: "none", padding: 0 }}>Supply depots</span>
                <span className="fl-hint" style={{ margin: 0 }}>Don't have a price yet? Tap a supplier, check the material, then add it below.</span>
              </div>
              <div className="so-sup-links">
                {suppliers.length === 0 && <span className="fl-hint" style={{ margin: 0 }}>No suppliers yet.</span>}
                {suppliers.map((s) => (
                  <span className="so-sup" key={s.id}>
                    <a className="so-sup-link" href={s.url} target="_blank" rel="noopener noreferrer">🔗 {s.name}</a>
                    {can.editPrices && <button className="so-sup-x" onClick={() => setSupplierForm({ ...emptySupplier(), ...s })}>edit</button>}
                    {can.editPrices && (confirmId === s.id
                      ? <><button className="fl-link danger" onClick={() => removeSupplier(s.id)}>del</button><button className="fl-link" onClick={() => setConfirmId(null)}>keep</button></>
                      : <button className="so-sup-x" onClick={() => setConfirmId(s.id)}>×</button>)}
                  </span>
                ))}
              </div>
              {can.editPrices && (
                <div className="so-sup-add">
                  <input value={supplierForm.name} placeholder="Supplier name" onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                  <input value={supplierForm.url} placeholder="rexelusa.com or full https:// link" onChange={(e) => setSupplierForm({ ...supplierForm, url: e.target.value })} />
                  <button className="fl-job-btn" onClick={saveSupplier}>{supplierForm.id ? "Update" : "+ Add supplier"}</button>
                  {supplierForm.id && <button className="fl-ghost" onClick={() => setSupplierForm(emptySupplier())}>Cancel</button>}
                </div>
              )}
            </div>
            {!can.editPrices && <p className="fl-readonly">Master price list — quote from this. Only Owner/Admin can change prices.</p>}
            {priceList.length === 0 ? <div className="fl-empty">No items yet.</div> : (
              <table className="so-table">
                <thead>
                  <tr>
                    <th>Item</th><th>Unit</th><th className="r">Price</th>
                    {can.seeNumbers && <th className="r">Cost</th>}
                    {can.seeNumbers && <th className="r">Margin</th>}
                    {can.editPrices && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {priceList.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.name}</strong>{p.category ? <span className="so-cat"> · {p.category}</span> : ""}</td>
                      <td>{p.unit}</td>
                      <td className="r">{money(p.price)}</td>
                      {can.seeNumbers && <td className="r">{money(p.cost)}</td>}
                      {can.seeNumbers && <td className="r ok">{money(num(p.price) - num(p.cost))}</td>}
                      {can.editPrices && (
                        <td className="r">
                          <button className="fl-link" onClick={() => setPriceForm({ ...emptyPriceItem(), ...p })}>Edit</button>
                          {confirmId === p.id ? (
                            <><button className="fl-link danger" onClick={() => removePriceItem(p.id)}>Del</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                          ) : <button className="fl-link" onClick={() => setConfirmId(p.id)}>×</button>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="fl-foot-note">Estimators see Item / Unit / Price so they can quote. Cost and margin stay with Owner/Admin.</p>
          </section>
        </div>
      )}

      {/* ════════════════════ MESSAGES (team) ════════════════════ */}
      {page === "messages" && (
        <div className="fl-weekly">
          <p className="fl-sub" style={{ marginTop: 0 }}>Messages</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12 }}>{isAdmin ? "Message your whole team at once, or pick a person for a private line. Replies from an estimator come straight to you." : "Message the office on your private line, or post to the whole team. Only the office sees your private line — not the other estimators."}</p>
          <div className="so-subnav">
            {msgTargets.map((t) => { const u = unreadForThread(t.key); return (
              <button key={t.key} className={"fl-pill" + (effTarget === t.key ? " active" : "")} onClick={() => setMsgTarget(t.key)}>{t.label}{u ? " (" + u + ")" : ""}</button>
            ); })}
          </div>
          <div className="so-msg-thread">
            {threadMsgs.length === 0 ? <div className="fl-empty">No messages here yet. Start the conversation below.</div> : threadMsgs.map((m) => (
              <div className={"so-msg" + (m.from === actorKey ? " mine" : "")} key={m.id}>
                <div className="so-msg-meta">{m.from}{m.role ? " · " + m.role : ""} · {fmtDateTime(m.ts)}</div>
                <div className="so-msg-text">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="so-msg-compose">
            <textarea rows={2} value={msgDraft} placeholder={"Message " + ((msgTargets.find((t) => t.key === effTarget) || {}).label || "the team") + "…"} onChange={(e) => setMsgDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendMessage(); }} />
            <button className="fl-primary" onClick={sendMessage} disabled={!msgDraft.trim()}>Send</button>
          </div>
          <p className="fl-foot-note" style={{ marginTop: 8 }}>Tip: ⌘/Ctrl + Enter sends. New messages light up the “messages” chip at the top for whoever hasn't read them.</p>
        </div>
      )}

      {/* ════════════════════ SETTINGS HUB sub-nav ════════════════════ */}
      {page === "settings" && (
        <div className="so-subnav">
          <button className={"fl-pill" + (settingsSub === "help" ? " active" : "")} onClick={() => setSettingsSub("help")}>Help</button>
          <button className={"fl-pill" + (settingsSub === "sops" ? " active" : "")} onClick={() => setSettingsSub("sops")}>SOPs</button>
          {can.editProfile && <button className={"fl-pill" + (settingsSub === "account" ? " active" : "")} onClick={() => setSettingsSub("account")}>Account</button>}
          {can.managePeople && <button className={"fl-pill" + (settingsSub === "audit" ? " active" : "")} onClick={() => setSettingsSub("audit")}>Audit log</button>}
          <button className={"fl-pill" + (settingsSub === "preferences" ? " active" : "")} onClick={() => setSettingsSub("preferences")}>Preferences</button>
        </div>
      )}

      {/* ════════════════════ SOPs ════════════════════ */}
      {page === "settings" && settingsSub === "sops" && (
        <div className="fl-weekly">
          {can.editSops && sopEditId !== "new" && (
            <button className="fl-job-btn" style={{ marginBottom: 14 }} onClick={() => startSop(null)}>+ Add SOP</button>
          )}
          {sopEditId === "new" && (
            <div className="fl-emp-card" style={{ borderTopColor: "var(--amber-deep)" }}>
              <div className="fl-form" style={{ padding: 0 }}>
                <Field label="Title"><input value={sopDraft.title} onChange={(e) => setSopDraft({ ...sopDraft, title: e.target.value })} /></Field>
                <Field label="Steps / body"><textarea rows={8} value={sopDraft.body} onChange={(e) => setSopDraft({ ...sopDraft, body: e.target.value })} /></Field>
                <Field label="Who can see this"><select value={sopDraft.role} onChange={(e) => setSopDraft({ ...sopDraft, role: e.target.value })}><option value="all">Everyone</option><option value="admin">Admins only</option></select></Field>
                <div className="fl-actions"><button className="fl-primary" onClick={saveSop}>Save SOP</button><button className="fl-ghost" onClick={() => setSopEditId(null)}>Cancel</button></div>
              </div>
            </div>
          )}
          {(() => { const visibleSops = isAdmin ? sops : sops.filter((s) => s.role !== "admin"); return (
          visibleSops.length === 0 && sopEditId !== "new" ? <div className="fl-empty">No SOPs yet.</div> : visibleSops.map((s) => (
            sopEditId === s.id ? (
              <div className="fl-emp-card" key={s.id} style={{ borderTopColor: "var(--amber-deep)" }}>
                <div className="fl-form" style={{ padding: 0 }}>
                  <Field label="Title"><input value={sopDraft.title} onChange={(e) => setSopDraft({ ...sopDraft, title: e.target.value })} /></Field>
                  <Field label="Steps / body"><textarea rows={8} value={sopDraft.body} onChange={(e) => setSopDraft({ ...sopDraft, body: e.target.value })} /></Field>
                  <Field label="Who can see this"><select value={sopDraft.role} onChange={(e) => setSopDraft({ ...sopDraft, role: e.target.value })}><option value="all">Everyone</option><option value="admin">Admins only</option></select></Field>
                  <div className="fl-actions"><button className="fl-primary" onClick={saveSop}>Save</button><button className="fl-ghost" onClick={() => setSopEditId(null)}>Cancel</button></div>
                </div>
              </div>
            ) : (
              <div className="fl-emp-card" key={s.id}>
                <div className="fl-emp-head">
                  <h3>{s.title}{s.role === "admin" ? " 🔒" : ""}</h3>
                  {can.editSops && (
                    <span className="fl-card-actions">
                      <button className="fl-link" onClick={() => startSop(s)}>Edit</button>
                      {confirmId === s.id ? (
                        <><button className="fl-link danger" onClick={() => removeSop(s.id)}>Delete</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                      ) : <button className="fl-link" onClick={() => setConfirmId(s.id)}>Remove</button>}
                    </span>
                  )}
                </div>
                <pre className="so-sop-body">{s.body}</pre>
              </div>
            )
          )) ); })()}
          <p className="fl-foot-note">SOPs are the playbook every estimator follows. Owner/Admin keep them current; everyone reads them.</p>
        </div>
      )}

      {/* ════════════════════ NUMBERS (admin) ════════════════════ */}
      {page === "numbers" && can.seeNumbers && (
        <div className="fl-weekly">
          <div className="fl-emp-card team">
            <div className="fl-emp-head"><h3>The numbers</h3><span className="fl-emp-count">Owner / Admin only</span></div>
            <div className="fl-comm-summary">
              <div><span className="fl-comm-num">{money(estPipeline)}</span><span className="fl-comm-lbl">approved pipeline</span></div>
              <div><span className="fl-comm-num">{money(invTotal)}</span><span className="fl-comm-lbl">invoiced</span></div>
              <div><span className="fl-comm-num">{money(invPaid)}</span><span className="fl-comm-lbl">paid</span></div>
            </div>
            <div className="fl-comm-summary" style={{ marginTop: 10 }}>
              <div><span className="fl-comm-num">{money(invOutstanding)}</span><span className="fl-comm-lbl">outstanding</span></div>
              <div><span className="fl-comm-num">{money(invCost)}</span><span className="fl-comm-lbl">cost of invoiced / royalties</span></div>
              <div className="hot"><span className="fl-comm-num">{money(invMargin)}</span><span className="fl-comm-lbl">gross margin</span></div>
            </div>
          </div>
          <p className="fl-sub">By estimator</p>
          {repNames.length === 0 ? <div className="fl-empty">Add people on the Team tab to see per-estimator numbers.</div> : repNames.map((rep) => {
            const myEst = estimates.filter((e) => (e.createdBy || "").trim() === rep);
            const myInv = invoices.filter((i) => (i.createdBy || "").trim() === rep);
            const sold = myInv.reduce((s, i) => s + recTotals(i).total, 0);
            const margin = myInv.reduce((s, i) => s + recSub(i), 0) - myInv.reduce((s, i) => s + costOfLines(i.lines), 0);
            if (myEst.length === 0 && myInv.length === 0) return null;
            return (
              <div className="fl-emp-card" key={rep}>
                <div className="fl-emp-head"><h3>{rep}</h3><span className="fl-emp-count">{myEst.length} est · {myInv.length} inv</span></div>
                <div className="fl-comm-summary">
                  <div><span className="fl-comm-num">{myEst.length}</span><span className="fl-comm-lbl">estimates built</span></div>
                  <div><span className="fl-comm-num">{money(sold)}</span><span className="fl-comm-lbl">invoiced</span></div>
                  <div className="hot"><span className="fl-comm-num">{money(margin)}</span><span className="fl-comm-lbl">margin</span></div>
                </div>
              </div>
            );
          })}
          <p className="fl-foot-note">Margin uses each line's internal cost from the price list. Items quoted off-list have no cost recorded and count as full margin until you add them.</p>
        </div>
      )}

      {/* ════════════════════ MY PAY (estimator) ════════════════════ */}
      {page === "mypay" && !can.seeNumbers && (() => {
        const mine = payouts.filter((p) => p.rep === myName);
        const approved = mine.filter((p) => p.status === "Approved");
        const pending = mine.filter((p) => p.status === "Pending" || !p.status);
        const approvedTotal = approved.reduce((s, p) => s + (p.amount || 0), 0);
        const pendingTotal = pending.reduce((s, p) => s + (p.amount || 0), 0);
        return (
          <div className="fl-weekly">
            <p className="fl-sub" style={{ marginTop: 0 }}>My pay</p>
            <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12 }}>What you've earned on the jobs you've closed. “Approved” is locked in — that's what you're getting paid. Your office hands you the printed stub at payday.</p>
            <div className="fl-comm-summary">
              <div className="hot"><span className="fl-comm-num">{money(approvedTotal)}</span><span className="fl-comm-lbl">approved — getting paid</span></div>
              <div><span className="fl-comm-num">{money(pendingTotal)}</span><span className="fl-comm-lbl">pending your office</span></div>
            </div>
            <p className="fl-sub">Approved payouts · {approved.length}</p>
            {approved.length === 0 ? <div className="fl-empty">Nothing approved yet. Once your office approves a payout, it shows here.</div> : (
              <div className="fl-emp-card" style={{ padding: 0 }}>
                {approved.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)).map((p) => (
                  <div className="so-audit-row" key={p.id}>
                    <div className="so-audit-main"><span className="so-audit-action">{money(p.amount)}</span><span className="so-audit-detail"> — {p.client || "job"}{p.invoiceNo ? " · #" + p.invoiceNo : ""}</span></div>
                    <div className="so-audit-meta">{fmtDate(toLocalDate(new Date(p.ts || Date.now())))}</div>
                  </div>
                ))}
              </div>
            )}
            {pending.length > 0 && <p className="fl-foot-note" style={{ marginTop: 10 }}>You have {pending.length} payout{pending.length > 1 ? "s" : ""} waiting on your office to approve. They'll move up to “approved” once they're cleared.</p>}
          </div>
        );
      })()}

      {/* ════════════════════ ROYALTIES (admin) ════════════════════ */}
      {page === "royalties" && (
        <div className="fl-weekly">
          {isAdmin && (
            <div className="fl-emp-card" style={{ borderTopColor: "var(--amber)", marginBottom: 16 }}>
              <div className="fl-form" style={{ padding: 0 }}>
                <p className="fl-sub" style={{ marginTop: 0 }}>Printouts</p>
                <p className="fl-hint">Enter the time frame you want to pay for, then export.</p>
                <div className="fl-two">
                  <Field label="From"><input type="date" value={royaltyFrom} onChange={(e) => setRoyaltyFrom(e.target.value)} /></Field>
                  <Field label="To"><input type="date" value={royaltyTo} onChange={(e) => setRoyaltyTo(e.target.value)} /></Field>
                </div>
                <div className="fl-actions" style={{ marginTop: 4 }}>
                  <button className="fl-job-btn" onClick={exportRoyaltiesOwed}>⬇ Royalties owed (CSV)</button>
                  <button className="fl-job-btn" onClick={exportPaidAddresses}>⬇ Paid-in-full addresses (CSV)</button>
                </div>
                <p className="fl-foot-note" style={{ marginBottom: 0 }}>“Royalties owed” lists what each estimator is owed between {fmtDate(royaltyFrom)} and {fmtDate(royaltyTo)}. “Paid-in-full addresses” lists every job closed out in that window — drop those into your outreach site to settle who gets the address royalty. Open a CSV in Excel/Sheets and print to PDF from there if you need paper.</p>
              </div>
            </div>
          )}
          <p className="fl-sub" style={{ marginTop: 0 }}>{isAdmin ? "Invoice payouts (everyone)" : "My pay"}</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12 }}>
            {isAdmin ? `Each invoice an estimator sends earns them ${money(payoutAmt)}, once you approve it on the Approvals tab.` : `You earn ${money(payoutAmt)} for each invoice you send, once the office approves it.`}
          </p>
          <div className="fl-comm-summary">
            <div className="hot"><span className="fl-comm-num">{money(payApproved)}</span><span className="fl-comm-lbl">approved</span></div>
            <div><span className="fl-comm-num">{money(payPending)}</span><span className="fl-comm-lbl">pending approval</span></div>
            <div><span className="fl-comm-num">{payDenied}</span><span className="fl-comm-lbl">denied</span></div>
          </div>
          {myPayouts.length === 0 ? <div className="fl-empty">No payouts yet. Send an invoice and {money(payoutAmt)} shows up here for approval.</div> : (
            <div className="fl-fu-list" style={{ marginBottom: 6 }}>
              {myPayouts.map((p) => (
                <div className="fl-fu-row" key={p.id}>
                  <span className="fl-fu-meta">{fmtDateTime(p.ts)}{p.invoiceNo ? " · #" + p.invoiceNo : ""}</span>
                  <span className="fl-fu-note">{isAdmin ? (p.rep || "—") + " · " : ""}{p.client || "—"} · {p.status}</span>
                  <span className="fl-comm-amt">{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <p className="fl-sub" style={{ marginTop: 20 }}>Outreach royalties ({ROYALTY_RATE * 100}%)</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 14 }}>
            Each invoice's job address is matched to whoever first walked it in the Client Outreach app. {ROYALTY_RATE * 100}% of the invoice goes to that estimator, payable {ROYALTY_VEST_DAYS} days after the invoice date.
          </p>

          {isAdmin ? (
            <>
              {vestedUnsynced.length > 0 && (
                <div className="fl-emp-card team">
                  <div className="fl-emp-head">
                    <h3>{vestedUnsynced.length} vested · {money(vestedUnsynced.reduce((s, r) => s + r.royalty, 0))} in royalties</h3>
                    <button className="fl-job-btn" onClick={() => syncToOutreach(vestedUnsynced.map((r) => r.i))}>Send all to outreach app</button>
                  </div>
                </div>
              )}
              {royaltyByRep.length === 0 ? <div className="fl-empty">No invoices match an outreach estimator yet. Add a job address to an invoice that someone walked in.</div> : (
                <>
                  <p className="fl-sub">By estimator</p>
                  {royaltyByRep.map((g) => (
                    <div className="fl-emp-card" key={g.rep} style={{ borderTopColor: "var(--green)" }}>
                      <div className="fl-emp-head"><h3>{g.rep}</h3><span className="fl-emp-count">{g.rows.length} invoice{g.rows.length === 1 ? "" : "s"}</span></div>
                      <div className="fl-comm-summary">
                        <div className="hot"><span className="fl-comm-num">{money(g.vestedOwed)}</span><span className="fl-comm-lbl">vested ({ROYALTY_RATE * 100}%)</span></div>
                        <div><span className="fl-comm-num">{money(g.pendingOwed)}</span><span className="fl-comm-lbl">still vesting</span></div>
                        <div><span className="fl-comm-num">{money(g.vestedOwed + g.pendingOwed)}</span><span className="fl-comm-lbl">total</span></div>
                      </div>
                      <div className="fl-fu-list">
                        {g.rows.map((r) => (
                          <div className="fl-fu-row" key={r.i.id}>
                            <span className="fl-fu-meta">{fmtDate(r.i.date)}{r.i.invoiceNo ? " · #" + r.i.invoiceNo : ""}</span>
                            <span className="fl-fu-note">{r.i.client || r.i.address} · {r.vested ? (r.i.pushedToOutreach ? "✓ in outreach app" : "vested") : r.daysLeft + "d to vest"}</span>
                            <span className="fl-comm-amt">{money(r.royalty)}</span>
                            {r.vested && !r.i.pushedToOutreach && <button className="fl-link" onClick={() => syncToOutreach([r.i])}>Send</button>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (() => {
            const mine = royaltyByRep.find((g) => g.rep === myName);
            if (!mine) return <div className="fl-empty">No outreach royalties yet. These appear when an invoice's job address matches one you walked in the outreach app.</div>;
            return (
              <div className="fl-emp-card" style={{ borderTopColor: "var(--green)" }}>
                <div className="fl-comm-summary">
                  <div className="hot"><span className="fl-comm-num">{money(mine.vestedOwed)}</span><span className="fl-comm-lbl">vested</span></div>
                  <div><span className="fl-comm-num">{money(mine.pendingOwed)}</span><span className="fl-comm-lbl">still vesting</span></div>
                  <div><span className="fl-comm-num">{money(mine.vestedOwed + mine.pendingOwed)}</span><span className="fl-comm-lbl">total</span></div>
                </div>
                <div className="fl-fu-list">
                  {mine.rows.map((r) => (
                    <div className="fl-fu-row" key={r.i.id}>
                      <span className="fl-fu-meta">{fmtDate(r.i.date)}{r.i.invoiceNo ? " · #" + r.i.invoiceNo : ""}</span>
                      <span className="fl-fu-note">{r.i.client || r.i.address} · {r.vested ? "vested" : r.daysLeft + "d to vest"}</span>
                      <span className="fl-comm-amt">{money(r.royalty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ════════════════════ BUSINESS (letterhead) ════════════════════ */}
      {page === "settings" && settingsSub === "account" && can.editProfile && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Your business letterhead</h2></div>
            <div className="fl-form">
              <p className="fl-hint">This is what clients see at the top of every estimate and invoice you email — your logo and your company info. None of it is shared anywhere else.</p>
              <Field label="Logo">
                <div className="so-logo-row">
                  {profileForm.logo ? <img className="so-logo-prev" src={profileForm.logo} alt="logo" /> : <div className="so-logo-empty">No logo yet</div>}
                  <div>
                    <input type="file" accept="image/*" onChange={(ev) => {
                      const f = ev.target.files && ev.target.files[0]; if (!f) return;
                      if (f.size > 1500000) { setErr("That image is large — please use one under ~1.5 MB."); return; }
                      const reader = new FileReader();
                      reader.onload = () => setProfileForm((p) => ({ ...p, logo: reader.result }));
                      reader.readAsDataURL(f);
                    }} />
                    {profileForm.logo && <button type="button" className="fl-link" onClick={() => setProfileForm((p) => ({ ...p, logo: "" }))}>Remove logo</button>}
                  </div>
                </div>
              </Field>
              <Field label="Business name"><input value={profileForm.name} placeholder="Your company name" onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></Field>
              <Field label="Tagline (optional)"><input value={profileForm.tagline} placeholder="e.g. Licensed & insured · Est. 2014" onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })} /></Field>
              <Field label="Address"><input value={profileForm.address} placeholder="Street, City, State ZIP" onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} /></Field>
              <div className="fl-two">
                <Field label="Phone"><input value={profileForm.phone} placeholder="(555) 555-5555" onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></Field>
                <Field label="Email"><input value={profileForm.email} placeholder="you@yourcompany.com" onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></Field>
              </div>
              <Field label="Website (optional)"><input value={profileForm.website} placeholder="yourcompany.com" onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} /></Field>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions"><button className="fl-primary" onClick={saveProfile}>Save letterhead</button></div>
            </div>
          </section>

          <section className="fl-list">
            <div className="fl-panel-head"><h2>Preview</h2></div>
            <article className="fl-card so-letter">
              {profile.logo && <img className="so-letter-logo" src={profile.logo} alt="logo" />}
              <h3 className="so-letter-name">{profile.name || "Your business name"}</h3>
              {profile.tagline && <p className="so-letter-line">{profile.tagline}</p>}
              {profile.address && <p className="so-letter-line">{profile.address}</p>}
              {(profile.phone || profile.email) && <p className="so-letter-line">{[profile.phone, profile.email].filter(Boolean).join("  ·  ")}</p>}
              {profile.website && <p className="so-letter-line">{profile.website}</p>}
              <div className="so-letter-rule" />
              <p className="fl-hint">This heading is added to the top of every estimate/invoice you email. Use the <strong>Email me</strong> button on any estimate to send yourself a test copy.</p>
            </article>
          </section>
        </div>
      )}

      {/* ════════════════════ EMAILS ════════════════════ */}
      {page === "followups" && can.editProfile && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Edit your emails</h2></div>
            <div className="fl-form">
              <p className="fl-hint">These are the two automatic follow-up emails. Edit the wording however you like. The placeholders below fill in by themselves:</p>
              <p className="fl-foot-note" style={{ marginTop: 0 }}>
                <strong>{"{first}"}</strong> client's first name · <strong>{"{client}"}</strong> client/company · <strong>{"{estimate_no}"}</strong> estimate # · <strong>{"{invoice_no}"}</strong> invoice # · <strong>{"{total}"}</strong> total · <strong>{"{balance}"}</strong> amount owed · <strong>{"{due_date}"}</strong> due date · <strong>{"{review_url}"}</strong> review link · <strong>{"{company}"}</strong> your business name
              </p>
              <p className="so-callout">⚠ Please don't change the words inside the curly braces { } — those fill in automatically from your business information in Settings. Edit everything else freely.</p>
              <Field label="Follow-up 1 (day 8)"><textarea rows={9} value={profileForm.emailFollowup1} placeholder={DEFAULT_FOLLOWUP_1} onChange={(e) => setProfileForm({ ...profileForm, emailFollowup1: e.target.value })} /></Field>
              <div className="fl-actions" style={{ marginTop: -6 }}><button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, emailFollowup1: DEFAULT_FOLLOWUP_1 })}>Load standard template</button></div>
              <Field label="Follow-up 2 (day 13)"><textarea rows={9} value={profileForm.emailFollowup2} placeholder={DEFAULT_FOLLOWUP_2} onChange={(e) => setProfileForm({ ...profileForm, emailFollowup2: e.target.value })} /></Field>
              <div className="fl-actions" style={{ marginTop: -6 }}><button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, emailFollowup2: DEFAULT_FOLLOWUP_2 })}>Load standard template</button></div>
              <Field label="Review request (3 days after invoice sent)"><textarea rows={9} value={profileForm.emailReview} placeholder={DEFAULT_REVIEW} onChange={(e) => setProfileForm({ ...profileForm, emailReview: e.target.value })} /></Field>
              <div className="fl-actions" style={{ marginTop: -6 }}><button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, emailReview: DEFAULT_REVIEW })}>Load standard template</button></div>
              <Field label="Review link (where the client leaves a review)"><input value={profileForm.reviewUrl} placeholder="https://g.page/r/your-business/review" onChange={(e) => setProfileForm({ ...profileForm, reviewUrl: e.target.value })} /></Field>
              <p className="fl-foot-note" style={{ marginTop: -4 }}>This link is added to the review email automatically (or use <strong>{"{review_url}"}</strong> anywhere in the text).</p>
              <Field label="Past-due reminder (when an invoice is overdue)"><textarea rows={9} value={profileForm.emailOverdue} placeholder={DEFAULT_OVERDUE} onChange={(e) => setProfileForm({ ...profileForm, emailOverdue: e.target.value })} /></Field>
              <div className="fl-actions" style={{ marginTop: -6 }}><button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, emailOverdue: DEFAULT_OVERDUE })}>Load standard template</button></div>

              <p className="fl-sub" style={{ marginTop: 8 }}>How your email is addressed</p>
              <p className="fl-hint">Set the address clients see it come from, and the real inbox their replies should land in.</p>
              <div className="fl-two">
                <Field label="From address (what clients see)"><input value={profileForm.fromEmail} placeholder="no-reply@yourcompany.com" onChange={(e) => setProfileForm({ ...profileForm, fromEmail: e.target.value })} /></Field>
                <Field label="Reply-to (your real inbox)"><input value={profileForm.replyTo} placeholder="you@yourcompany.com" onChange={(e) => setProfileForm({ ...profileForm, replyTo: e.target.value })} /></Field>
              </div>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions"><button className="fl-primary" onClick={saveProfile}>Save emails</button></div>
            </div>
          </section>

          <section className="fl-list">
            <div className="fl-panel-head"><h2>Preview · Follow-up 1</h2></div>
            <article className="fl-card"><pre className="so-legal">{letterhead()}{fillTemplate(profileForm.emailFollowup1 || DEFAULT_FOLLOWUP_1, { client: "Sample Client", estimateNo: "1042", lines: [{ name: "x", qty: 1, unitPrice: 1850 }], mode: "itemized" })}</pre></article>
            <p className="fl-foot-note">Heads-up on the “from / reply-to” part: today the buttons open <em>your</em> mail app to send, so mail comes from your own address. The no-reply-from with replies routed to your real inbox switches on when email sending is connected (Vercel + an email service) — these saved fields are exactly what it uses.</p>
          </section>
        </div>
      )}

      {/* ════════════════════ WARRANTY ════════════════════ */}
      {page === "prices" && can.editProfile && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Your warranty</h2></div>
            <div className="fl-form">
              <p className="fl-hint">This is attached to the bottom of every estimate you email. It's premade with a one-year term and fills in your business name from the Business tab.{can.editProfile ? " You can edit the wording below." : ""}</p>
              {can.editProfile ? (
                <>
                  <Field label="Warranty text"><textarea rows={10} value={profileForm.warranty} placeholder={defaultWarranty(profileForm.name)} onChange={(e) => setProfileForm({ ...profileForm, warranty: e.target.value })} /></Field>
                  {err && <p className="fl-error">{err}</p>}
                  <div className="fl-actions">
                    <button className="fl-primary" onClick={saveProfile}>Save warranty</button>
                    <button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, warranty: defaultWarranty(profileForm.name) })}>Load standard template</button>
                  </div>
                </>
              ) : <pre className="so-legal">{warrantyText()}</pre>}
            </div>
          </section>
          <section className="fl-list">
            <div className="fl-panel-head"><h2>Preview</h2></div>
            <article className="fl-card"><pre className="so-legal">{warrantyText()}</pre></article>
          </section>
        </div>
      )}

      {/* ════════════════════ CONTRACT ════════════════════ */}
      {page === "prices" && can.editProfile && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Your service agreement</h2></div>
            <div className="fl-form">
              <p className="fl-hint">This contract is attached to every estimate you email. It's premade with <strong>Net 15</strong> terms and a clause covering third-party collection &amp; legal fees, and it fills in your business name automatically.{can.editProfile ? " Have your own attorney review wording before relying on it." : ""}</p>
              {can.editProfile ? (
                <>
                  <Field label="Agreement text"><textarea rows={14} value={profileForm.contract} placeholder={defaultContract(profileForm.name)} onChange={(e) => setProfileForm({ ...profileForm, contract: e.target.value })} /></Field>
                  {err && <p className="fl-error">{err}</p>}
                  <div className="fl-actions">
                    <button className="fl-primary" onClick={saveProfile}>Save agreement</button>
                    <button className="fl-ghost" onClick={() => setProfileForm({ ...profileForm, contract: defaultContract(profileForm.name) })}>Load standard template</button>
                  </div>
                </>
              ) : <pre className="so-legal">{contractText()}</pre>}
            </div>
          </section>
          <section className="fl-list">
            <div className="fl-panel-head"><h2>Preview</h2></div>
            <article className="fl-card"><pre className="so-legal">{contractText()}</pre></article>
          </section>
        </div>
      )}

      {/* ════════════════════ APPROVALS (admin) ════════════════════ */}
      {page === "alerts" && isAdmin && (
        <div className="fl-weekly">
          <p className="fl-sub" style={{ marginTop: 0 }}>Invoice payouts to approve · {pendingPayouts.length}</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12 }}>Each invoice an estimator sends earns them {money(payoutAmt)}. Approve or deny each one here. Approved payouts show on the estimator's “My pay” tab.</p>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12, color: "var(--amber-deep)" }}>⚠ Watch for splits: if you see more than one payout for the same address on the same day, that's likely one job broken into several invoices — approve only one per real job. Flagged ones are marked below.</p>
          {pendingPayouts.length === 0 ? (
            <div className="fl-empty">No payouts waiting. They appear here the moment an estimator marks an invoice “Sent.”</div>
          ) : pendingPayouts.map((p) => (
            <div className={"fl-job flag" + (isDupPayout(p) ? " so-dup" : "")} key={p.id} style={{ "--accent": isDupPayout(p) ? "var(--red)" : "var(--amber)" }}>
              <div className="fl-job-top">
                <div>
                  <h3>{money(p.amount)} → {p.rep || "(estimator)"}</h3>
                  <p className="fl-addr">Invoice{p.invoiceNo ? " #" + p.invoiceNo : ""}{p.client ? " · " + p.client : ""}{p.address ? " · " + p.address : ""} · {fmtDateTime(p.ts)}</p>
                </div>
                <span className="fl-status" style={{ background: isDupPayout(p) ? "var(--red)" : "var(--amber-deep)" }}>{isDupPayout(p) ? "Possible duplicate" : "Pending"}</span>
              </div>
              {isDupPayout(p) && <p className="fl-notes" style={{ color: "var(--red)" }}>⚠ Another pending payout shares this address &amp; day. Approve only one if it's the same job.</p>}
              <div className="fl-job-foot">
                <button className="fl-job-btn ok" onClick={() => setPayoutStatus(p.id, "Approved")}>Approve {money(p.amount)}</button>
                <button className="fl-job-btn danger" onClick={() => setPayoutStatus(p.id, "Denied")}>Deny</button>
              </div>
            </div>
          ))}

          <div className="so-alerts-head" style={{ marginTop: 22 }}>
            <p className="fl-sub" style={{ margin: 0 }}>Follow-ups running late · {lateFollowups.length}</p>
          </div>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 12 }}>An estimator's follow-up call is more than 3 days past due. Nudge them by email, or dismiss it with a reason (for example, the estimator is no longer with us).</p>
          {lateFollowups.length === 0 ? (
            <div className="fl-empty">Everyone's on top of their follow-ups. Nice.</div>
          ) : lateFollowups.map(({ e, step }) => (
            <div className="fl-job flag" key={e.id} style={{ "--accent": "var(--red)" }}>
              <div className="fl-job-top">
                <div>
                  <h3>{e.client || "(no client)"}{e.estimateNo ? " · #" + e.estimateNo : ""}</h3>
                  <p className="fl-addr">{step.kind === "call" ? "📞 " : "✉ "}{step.label} · {step.overdueDays}d overdue · estimator: {e.createdBy || "—"}</p>
                </div>
                <span className="fl-status" style={{ background: "var(--red)" }}>{step.overdueDays}d late</span>
              </div>
              <div className="so-late-foot">
                {repEmailByName(e.createdBy) && <a className="fl-job-btn" href={lateRepMailto(e)}>✉ Email the estimator</a>}
                <input className="so-late-reason" value={lateReason[e.id] || ""} placeholder="Reason to dismiss (optional)" onChange={(ev) => setLateReason((m) => ({ ...m, [e.id]: ev.target.value }))} />
                <button className="fl-job-btn danger" onClick={() => dismissLate(e)}>Dismiss</button>
              </div>
            </div>
          ))}

          <div className="so-alerts-head" style={{ marginTop: 22 }}>
            <p className="fl-sub" style={{ margin: 0 }}>Past-due invoices · {overdueToSend.length}</p>
          </div>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 10 }}>These are past their due date and unpaid. Send the past-due reminder — once you do, it moves to “watching” below.</p>
          {overdueToSend.length === 0 ? <div className="fl-empty">Nothing past due. 👍</div> : overdueToSend.map((i) => (
            <div className="fl-job flag" key={i.id} style={{ "--accent": "var(--red)" }}>
              <div className="fl-job-top">
                <div>
                  <h3>{i.client || "(no client)"}{i.invoiceNo ? " · #" + i.invoiceNo : ""}</h3>
                  <p className="fl-addr">{money(invBalance(i))} owed · was due {fmtDate(i.dueDate)} · {i.createdBy || "—"}</p>
                </div>
                <span className="fl-status" style={{ background: "var(--red)" }}>Past due</span>
              </div>
              <div className="fl-job-foot">
                {clientOf(i.client)?.email && <a className="fl-job-btn" href={overdueMailto(i)} onClick={() => markOverdueSent(i)}>✉ Send past-due notice</a>}
                <button className="fl-link" onClick={() => markOverdueSent(i)}>Mark notice sent</button>
              </div>
            </div>
          ))}

          {overdueWatching.length > 0 && (
            <>
              <div className="so-alerts-head" style={{ marginTop: 18 }}><p className="fl-sub" style={{ margin: 0 }}>Past-due notice sent — watching · {overdueWatching.length}</p></div>
              <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 10 }}>The client has been notified. If still unpaid {COLLECT_AFTER_DAYS} days from the notice, it moves to “call the client” below.</p>
              {overdueWatching.map((i) => (
                <div className="fl-emp-row" key={i.id}>
                  <span className="fl-emp-co">{i.client || "(no client)"}{i.invoiceNo ? " · #" + i.invoiceNo : ""}</span>
                  <span className="fl-emp-tags">{money(invBalance(i))} owed · notice sent {fmtDate(i.overdueEmailSentAt)}</span>
                </div>
              ))}
            </>
          )}

          <div className="so-alerts-head" style={{ marginTop: 18 }}>
            <p className="fl-sub" style={{ margin: 0 }}>Call the client (collections) · {collectionsDue.length}</p>
          </div>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 10 }}>Still unpaid {COLLECT_AFTER_DAYS}+ days after the past-due notice. Give them a call to see what's going on.</p>
          {collectionsDue.length === 0 ? <div className="fl-empty">No collection calls needed.</div> : collectionsDue.map((i) => {
            const c = clientOf(i.client);
            return (
              <div className="fl-job flag" key={i.id} style={{ "--accent": "var(--red)" }}>
                <div className="fl-job-top">
                  <div>
                    <h3>📞 {i.client || "(no client)"}{i.invoiceNo ? " · #" + i.invoiceNo : ""}</h3>
                    <p className="fl-addr">{money(invBalance(i))} owed · notice sent {fmtDate(i.overdueEmailSentAt)}{c && c.phone ? " · " + c.phone : ""}</p>
                  </div>
                  <span className="fl-status" style={{ background: "var(--red)" }}>Call</span>
                </div>
                <div className="fl-job-foot">
                  <button className="fl-job-btn" onClick={() => markCollectionDone(i.id)}>Handled — clear</button>
                </div>
              </div>
            );
          })}

          <div className="so-alerts-head" style={{ marginTop: 22 }}>
            <p className="fl-sub" style={{ margin: 0 }}>Estimate approvals · {approvalNotices.length}</p>
            {approvalNotices.length > 0 && <button className="fl-link" onClick={() => save(STORAGE.notifications, notifications.filter((n) => n.type === "sent"), setNotifications)}>Dismiss all</button>}
          </div>
          {approvalNotices.length === 0 ? (
            <div className="fl-empty">No new estimate approvals. When a client approves an estimate — by phone or by signing — it shows up here.</div>
          ) : approvalNotices.map((n) => (
            <div className="fl-job flag" key={n.id} style={{ "--accent": n.type === "declined" ? "var(--red)" : "var(--green)" }}>
              <div className="fl-job-top">
                <div>
                  <h3>{n.type === "declined" ? "✕ Estimate declined" : "✓ Estimate approved"}{n.estimateNo ? " · #" + n.estimateNo : ""}</h3>
                  <p className="fl-addr">{n.client || "(no client)"}{n.total ? " · " + money(n.total) : ""} · {fmtDateTime(n.ts)}</p>
                </div>
                <span className="fl-status" style={{ background: n.type === "declined" ? "var(--red)" : "var(--green)" }}>{n.type === "declined" ? "Declined" : "Approved"}</span>
              </div>
              <p className="fl-notes">{n.type === "declined" ? "The client declined this estimate (" + (n.via || "—") + ")." : "Approved via " + (n.via || "—") + (n.signedName ? " (" + n.signedName + ")" : "") + ". Ready to convert to an invoice on the Estimates tab."}</p>
              <div className="fl-job-foot">
                <button className="fl-link" onClick={() => dismissNotification(n.id)}>Dismiss</button>
              </div>
            </div>
          ))}

          <div className="so-alerts-head" style={{ marginTop: 22 }}>
            <p className="fl-sub" style={{ margin: 0 }}>Sent — your copies · {sentNotices.length}</p>
            {sentNotices.length > 0 && <button className="fl-link" onClick={clearSent}>Dismiss all</button>}
          </div>
          <p className="fl-foot-note" style={{ marginTop: 0, marginBottom: 10 }}>A copy of every estimate and invoice that goes out. Turn this off anytime in Settings.</p>
          {sentNotices.length === 0 ? (
            <div className="fl-empty">{notifySent ? "No copies yet. Each estimate/invoice that's sent will drop a copy here." : "Copies are turned off in Settings."}</div>
          ) : sentNotices.map((n) => (
            <div className="fl-job flag" key={n.id} style={{ "--accent": "var(--blue)" }}>
              <div className="fl-job-top">
                <div>
                  <h3>{n.kind === "invoice" ? "🧾 Invoice" : "📄 Estimate"} sent{n.no ? " · #" + n.no : ""}</h3>
                  <p className="fl-addr">{n.client || "(no client)"}{n.total ? " · " + money(n.total) : ""} · {fmtDateTime(n.ts)}</p>
                </div>
                <span className="fl-status" style={{ background: "var(--blue)" }}>Sent</span>
              </div>
              {n.body && <pre className="so-sop-body" style={{ marginTop: 6 }}>{n.body}</pre>}
              <div className="fl-job-foot">
                <button className="fl-link" onClick={() => { try { navigator.clipboard && navigator.clipboard.writeText(n.body || ""); setErr("Copy copied."); } catch (x) {} }}>Copy text</button>
                <button className="fl-link" onClick={() => dismissNotification(n.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════ HELP ════════════════════ */}
      {page === "settings" && settingsSub === "help" && (
        <div className="fl-weekly">
          <input className="so-help-search" value={helpQuery} placeholder="Search help — e.g. payment, follow-up, dark mode" onChange={(e) => setHelpQuery(e.target.value)} />
          {helpResults.length === 0 ? (
            <div className="fl-empty">No articles matched “{helpQuery}”. Try fewer or different words — or reach out below.</div>
          ) : helpResults.map((a) => (
            <div className="fl-emp-card" key={a.title}>
              <div className="fl-emp-head"><h3>{a.title}</h3></div>
              <pre className="so-sop-body">{a.body}</pre>
            </div>
          ))}

          <div className="fl-emp-card so-support" style={{ borderTopColor: "var(--amber)" }}>
            <div className="fl-emp-head"><h3>Still need help?</h3></div>
            <div className="fl-form" style={{ padding: 0 }}>
              <p className="fl-hint">If the articles above didn't solve it, send us a note and we'll get back to you.</p>
              <div className="fl-two">
                <Field label="Your name"><input value={supportForm.name} onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })} /></Field>
                <Field label="Your email"><input value={supportForm.email} placeholder="you@email.com" onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })} /></Field>
              </div>
              <Field label="Which app are you asking about?">
                <select value={supportForm.app} onChange={(e) => setSupportForm({ ...supportForm, app: e.target.value })}>
                  <option>ReyGuild — Estimating &amp; Invoicing</option>
                  <option>ReyGuild — Client Outreach &amp; Commissions</option>
                  <option>Other / not sure</option>
                </select>
              </Field>
              <Field label="What's going on?"><textarea rows={4} value={supportForm.message} placeholder="Describe the problem or question…" onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })} /></Field>
              <div className="fl-actions">
                <a className="fl-primary" href={supportMailto()}>Email support</a>
              </div>
              <p className="fl-hint">Or email <a className="fl-link" href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a> directly.</p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ ACCOUNT / SUBSCRIPTION ════════════════════ */}
      {page === "settings" && settingsSub === "account" && can.managePeople && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Your subscription</h2></div>
            <div className="fl-form">
              <div className="so-sub-row">
                <div className="so-sub-info">
                  <span className="so-sub-plan">{PLAN.name}</span>
                  <span className="so-sub-cycle">Billed every {PLAN.cycleDays} days to the card on file</span>
                </div>
                <span className="fl-status" style={{ background: account.status === "active" ? "var(--green)" : account.status === "paused" ? "var(--amber-deep)" : "var(--red)" }}>{account.status}</span>
              </div>
              <p className="fl-hint">Card on file: {account.cardLast4 ? "•••• " + account.cardLast4 : "none yet"} · Billing email: {account.email || "not set"}</p>
              <div className="fl-actions">
                {account.status === "active" && <><button className="fl-ghost" onClick={() => setSub("paused")}>Pause subscription</button><button className="fl-link danger" onClick={() => setSub("canceled")}>Cancel</button></>}
                {account.status === "paused" && <><button className="fl-primary" onClick={() => setSub("active")}>Resume</button><button className="fl-link danger" onClick={() => setSub("canceled")}>Cancel</button></>}
                {account.status === "canceled" && <button className="fl-primary" onClick={() => setSub("active")}>Reactivate</button>}
              </div>
              <p className="fl-foot-note">Live billing runs through Stripe. Pause and cancel here control your plan; once Stripe is connected, these buttons manage the real subscription and the card on file is charged automatically every {PLAN.cycleDays} days. You can pause or cancel anytime.</p>
            </div>
          </section>

          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Account details</h2></div>
            <div className="fl-form">
              <Field label="Billing email"><input value={account.email} placeholder="you@yourcompany.com" onChange={(e) => setAccount({ ...account, email: e.target.value })} /></Field>
              <Field label="Privacy Policy & Terms link"><input value={account.legalUrl} placeholder="https://yourcompany.com/terms" onChange={(e) => setAccount({ ...account, legalUrl: e.target.value })} /></Field>
              {account.legalUrl && <p className="fl-hint"><a className="fl-link" href={account.legalUrl} target="_blank" rel="noopener noreferrer">Open Privacy &amp; Terms ↗</a></p>}
              <div className="fl-actions"><button className="fl-primary" onClick={saveAccount}>Save account</button></div>
              <p className="fl-foot-note">Manage your card and payment method in the Stripe billing portal once it's connected. Questions about your account? Email <a className="fl-link" href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.</p>
            </div>
          </section>
        </div>
      )}

      {/* ════════════════════ SETTINGS ════════════════════ */}
      {page === "settings" && settingsSub === "preferences" && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>Appearance</h2></div>
            <div className="fl-form">
              <p className="fl-hint">Choose how the app looks. Your choice is saved on this device.</p>
              <Seg value={theme === "dark" ? "Dark" : "Light"} options={["Light", "Dark"]} onChange={(v) => applyTheme(v === "Dark" ? "dark" : "light")} />
              <p className="fl-hint">Light is the warm paper look you have now. Dark uses a navy-blue background that's easier on the eyes at night.</p>
            </div>
          </section>
          {isAdmin && (
            <section className="fl-panel">
              <div className="fl-panel-head"><h2>Estimator pay</h2></div>
              <div className="fl-form">
                <p className="fl-hint">How much an estimator earns for each invoice they send (you still approve each one on the Approvals tab). Changing this affects new payouts only — ones already created keep their amount.</p>
                <Field label="Payout per invoice ($)"><input inputMode="decimal" value={payoutDraft} onChange={(e) => setPayoutDraft(e.target.value)} /></Field>
                <p className="fl-foot-note" style={{ marginTop: -4 }}>Currently {money(payoutAmt)} per invoice.</p>
                {err && <p className="fl-error">{err}</p>}
                <div className="fl-actions"><button className="fl-primary" onClick={savePayout}>Save payout amount</button></div>
              </div>
            </section>
          )}
          {isAdmin && (
            <section className="fl-panel">
              <div className="fl-panel-head"><h2>Notifications</h2></div>
              <div className="fl-form">
                <p className="fl-hint">Get a copy of every estimate and invoice that goes out, on the Approvals tab. Turn it off if it gets to be too much.</p>
                <Seg value={notifySent ? "On" : "Off"} options={["On", "Off"]} onChange={() => toggleNotifySent()} />
                <p className="fl-foot-note" style={{ marginTop: -4 }}>Copies of sent estimates/invoices are currently <strong>{notifySent ? "on" : "off"}</strong>.</p>
              </div>
            </section>
          )}
          <section className="fl-list">
            <div className="fl-panel-head"><h2>Preview</h2></div>
            <article className="fl-card">
              <div className="fl-comm-summary">
                <div className="hot"><span className="fl-comm-num">Aa</span><span className="fl-comm-lbl">{theme === "dark" ? "Dark — navy" : "Light — paper"}</span></div>
              </div>
              <p className="fl-notes">This card shows the current theme. Switch on the left to see it change instantly.</p>
            </article>
          </section>
        </div>
      )}

      {/* ════════════════════ AUDIT LOG (owner) ════════════════════ */}
      {page === "settings" && settingsSub === "audit" && can.managePeople && (
        <div className="fl-weekly">
          <div className="so-alerts-head">
            <p className="fl-sub" style={{ margin: 0 }}>Activity · {audit.length}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="fl-link" onClick={() => { const rows = [["When", "Who", "Role", "Action", "Detail"]]; audit.forEach((a) => rows.push([new Date(a.ts).toLocaleString(), a.who, a.role, a.action, a.detail])); if (!downloadTextFile("audit-log.csv", toCsv(rows), "text/csv;charset=utf-8")) setErr("Couldn't create the file."); }}>Export CSV</button>
              {audit.length > 0 && (confirmId === "audit" ? <><button className="fl-link danger" onClick={() => { save(STORAGE.audit, [], setAudit); setConfirmId(null); }}>Clear all</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></> : <button className="fl-link" onClick={() => setConfirmId("audit")}>Clear</button>)}
            </div>
          </div>
          <input className="so-help-search" value={auditQuery} placeholder="Search the log — name, action, client…" onChange={(e) => setAuditQuery(e.target.value)} />
          <p className="fl-foot-note" style={{ marginTop: 0 }}>Every important change is recorded here: who did it, when, and what. Owner-only. Keeps the most recent 600 entries.</p>
          {(() => {
            const q = auditQuery.trim().toLowerCase();
            const rows = q ? audit.filter((a) => (a.who + " " + a.role + " " + a.action + " " + a.detail).toLowerCase().includes(q)) : audit;
            if (rows.length === 0) return <div className="fl-empty">{audit.length === 0 ? "No activity yet. Actions will appear here as you and your team use the app." : "Nothing matched that search."}</div>;
            return (
              <div className="fl-emp-card" style={{ padding: 0 }}>
                {rows.map((a) => (
                  <div className="so-audit-row" key={a.id}>
                    <div className="so-audit-main"><span className="so-audit-action">{a.action}</span>{a.detail ? <span className="so-audit-detail"> — {a.detail}</span> : null}</div>
                    <div className="so-audit-meta">{a.who || "—"} · {a.role} · {fmtDateTime(a.ts)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ════════════════════ TEAM (owner) ════════════════════ */}
      {page === "team" && isAdmin && (
        <div className="fl-grid">
          <section className="fl-panel">
            <div className="fl-panel-head"><h2>{personForm.id ? "Edit person" : "Add person"}</h2></div>
            <div className="fl-form">
              <Field label="Name"><input value={personForm.name} placeholder="Full name" onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} /></Field>
              <Field label="Role"><Seg value={personForm.role} options={ROLES} onChange={(v) => setPersonForm({ ...personForm, role: v })} /></Field>
              <div className="fl-two">
                <Field label="Email"><input value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} /></Field>
                <Field label="Phone"><input value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} /></Field>
              </div>
              <Field label={"Payout per invoice ($, blank = default " + money(payoutAmt) + ")"}><input inputMode="decimal" value={personForm.payout} placeholder={String(payoutAmt)} onChange={(e) => setPersonForm({ ...personForm, payout: e.target.value })} /></Field>
              <p className="fl-hint">Owner runs everything · Admin runs the estimators and sees the numbers · Estimator builds estimates &amp; invoices.</p>
              {err && <p className="fl-error">{err}</p>}
              <div className="fl-actions">
                <button className="fl-primary" onClick={savePerson}>{personForm.id ? "Update person" : "Add person"}</button>
                {personForm.id && <button className="fl-ghost" onClick={() => { setPersonForm(emptyPerson()); setErr(""); }}>Cancel</button>}
              </div>
            </div>
          </section>
          <section className="fl-list">
            {people.length === 0 ? <div className="fl-empty">No one added yet. Add your admins and estimators here.</div> : (
              <div className="fl-cards">
                {ROLES.map((r) => {
                  const group = people.filter((p) => p.role === r);
                  if (!group.length) return null;
                  return (
                    <div key={r}>
                      <p className="fl-sub">{r}{group.length > 1 ? "s" : ""} · {group.length}</p>
                      {group.map((p) => (
                        <article className="fl-person" key={p.id} style={{ "--accent": ROLE_COLOR[p.role] || "var(--ink-2)" }}>
                          <div>
                            <h3>{p.name}</h3>
                            <p className="fl-pmeta">{[p.email, p.phone].filter(Boolean).join(" · ") || "no contact details"}</p>
                          </div>
                          <div className="fl-card-actions">
                            <button className="fl-link" onClick={() => setPersonForm({ ...emptyPerson(), ...p })}>Edit</button>
                            {confirmId === p.id ? (
                              <><button className="fl-link danger" onClick={() => removePerson(p.id)}>Delete</button><button className="fl-link" onClick={() => setConfirmId(null)}>Keep</button></>
                            ) : <button className="fl-link" onClick={() => setConfirmId(p.id)}>Remove</button>}
                          </div>
                        </article>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
      </div>

      {/* shared datalists */}
      <datalist id="so-clients">{clientNames.map((c, i) => <option key={i} value={c} />)}</datalist>
      <datalist id="so-items">{priceNames.map((n, i) => <option key={i} value={n} />)}</datalist>
      <datalist id="so-addrs">{Array.from(new Set([...clients.map((c) => c.address), ...outreachVisits.map((v) => v.address)].filter(Boolean))).map((a, i) => <option key={i} value={a} />)}</datalist>
      <datalist id="so-reps">{repNames.map((n, i) => <option key={i} value={n} />)}</datalist>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="fl-field"><span>{label}</span>{children}</label>;
}

function SignaturePad({ client, onApprove, onThink, onDecline, onCancel }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [name, setName] = useState("");
  function pos(e) {
    const c = canvasRef.current, r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e) { e.preventDefault(); drawing.current = true; const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} }
  function move(e) { if (!drawing.current) return; e.preventDefault(); const ctx = canvasRef.current.getContext("2d"); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#16243F"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); setHasDrawn(true); }
  function up() { drawing.current = false; }
  function clear() { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setHasDrawn(false); }
  function approve() {
    const sig = hasDrawn ? canvasRef.current.toDataURL("image/png") : "";
    onApprove(name.trim(), sig);
  }
  return (
    <div className="so-sign">
      <p className="so-sign-title">Your decision{client ? " — " + client : ""}</p>
      <p className="so-sign-hint">To accept, sign below (finger or mouse) or type your full name, then tap Accept &amp; sign. Or choose one of the other options.</p>
      <canvas ref={canvasRef} className="so-sign-canvas" width={520} height={150}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <div className="so-sign-row">
        <input className="so-sign-name" value={name} placeholder="Type full name" onChange={(e) => setName(e.target.value)} />
        <button type="button" className="fl-link" onClick={clear}>Clear</button>
      </div>
      <div className="so-sign-actions">
        <button className="fl-primary" onClick={approve} disabled={!hasDrawn && !name.trim()}>Accept &amp; sign</button>
        <button className="fl-ghost" onClick={onThink}>Let me think on it</button>
        <button className="fl-job-btn danger" onClick={onDecline}>Decline</button>
        <button className="fl-link" onClick={onCancel}>Close</button>
      </div>
    </div>
  );
}

function Seg({ value, options, onChange, clearable }) {
  return (
    <div className="fl-seg">
      {options.map((o) => (
        <button key={o} className={"fl-seg-btn" + (value === o ? " on" : "")}
          onClick={() => onChange(clearable && value === o ? "" : o)}>{o}</button>
      ))}
    </div>
  );
}

const CSS = `
.fl-root *{box-sizing:border-box}
.fl-root{
  --ink:#16243F; --ink-2:#222d46; --paper:#F5F3EE; --paper-2:#FFFFFF;
  --field-bg:#ffffff;
  --line:#E4DECF; --amber:#DFA63A; --amber-deep:#C68A1E;
  --green:#2F7D52; --red:#BC4A3C; --blue:#34507A; --muted:#39415a;
  font-family:'Inter',system-ui,sans-serif; color:var(--ink);
  background:var(--paper); min-height:100%; padding:18px; color-scheme:light;
}
.fl-root.so-dark{
  --ink:#EEF1F8; --ink-2:#C6CFE0; --paper:#13203A; --paper-2:#1C2C4A;
  --field-bg:#22324F;
  --line:#2C3D5E; --amber:#E0B25A; --amber-deep:#D7A23E;
  --green:#3E9D6A; --red:#D2685A; --blue:#5C7EB8; --muted:#9AA7C2;
  color-scheme:dark;
}
.fl-root.so-dark input, .fl-root.so-dark select, .fl-root.so-dark textarea{ background:var(--field-bg); color:var(--ink); border-color:var(--line); }
.fl-root.so-dark .so-sign-canvas, .fl-root.so-dark .so-logo-prev{ background:#fff; }
.so-help-search{width:100%; padding:13px 16px; font-size:16px; border:1px solid var(--line); border-radius:2px; background:var(--field-bg); color:var(--ink); margin-bottom:14px}
.so-support{margin-top:8px}
.so-email-prompt{display:inline-flex; gap:6px; align-items:center}
.so-banner{margin:12px 0 0; padding:11px 16px; background:var(--red); color:#fff; border-radius:2px; font-weight:800; cursor:pointer}
.so-due-row{display:flex; gap:8px; align-items:center}
.so-due-stamp{margin:4px 0; font-size:13px; color:var(--muted); font-weight:700}
.so-due-stamp.over{color:var(--red)}
.so-sub-row{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--line)}
.so-sub-info{display:flex; flex-direction:column}
.so-sub-plan{font-size:20px; font-weight:800}
.so-sub-cycle{font-size:13px; color:var(--muted)}
.so-audit-row{display:flex; justify-content:space-between; gap:12px; padding:10px 14px; border-bottom:1px solid var(--line); flex-wrap:wrap}
.so-audit-row:last-child{border-bottom:none}
.so-audit-action{font-weight:800}
.so-audit-detail{color:var(--ink-2)}
.so-audit-meta{font-size:12px; color:var(--muted); white-space:nowrap}
.so-subnav{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px}
.so-msg-thread{display:flex; flex-direction:column; gap:8px; max-height:52vh; overflow-y:auto; padding:4px 2px 8px}
.so-msg{max-width:80%; align-self:flex-start; background:var(--paper-2); border:1px solid var(--line); border-radius:10px; border-top-left-radius:2px; padding:8px 12px}
.so-msg.mine{align-self:flex-end; background:var(--amber); border-color:var(--amber-deep); border-radius:10px; border-top-right-radius:2px}
.so-msg.mine .so-msg-meta{color:#5a4413}
.so-msg-meta{font-size:11px; color:var(--muted); margin-bottom:3px}
.so-msg-text{white-space:pre-wrap; line-height:1.4}
.so-msg-compose{display:flex; gap:8px; align-items:flex-end; margin-top:12px; border-top:1px solid var(--line); padding-top:12px}
.so-msg-compose textarea{flex:1; padding:10px 12px; border:1px solid var(--line); border-radius:2px; background:var(--field-bg); color:var(--ink); resize:vertical}
.so-legal-toggle{display:flex; align-items:center; gap:8px; font-size:14px; color:var(--ink-2); margin:2px 0 4px; cursor:pointer}
.so-legal-toggle input{width:16px; height:16px}
.so-banner-info{margin:0 0 16px; padding:12px 16px; background:var(--ink); color:var(--paper-2); border-radius:2px; font-weight:800; letter-spacing:.02em; line-height:1.4}
.so-callout{margin:0 0 10px; padding:9px 12px; background:rgba(223,166,58,.14); border:1px solid var(--amber); border-radius:2px; font-size:13px; color:var(--ink-2)}
.so-photo-btns{display:flex; gap:8px; flex-wrap:wrap}
.so-photos{display:flex; gap:8px; flex-wrap:wrap; margin-top:8px}
.so-photo{position:relative; width:74px; height:74px}
.so-photo img{width:74px; height:74px; object-fit:cover; border:1px solid var(--line); border-radius:2px}
.so-photo button{position:absolute; top:-7px; right:-7px; width:20px; height:20px; border-radius:50%; border:none; background:var(--red); color:#fff; cursor:pointer; line-height:1; font-weight:800}
.so-photo-view{max-width:140px; max-height:140px; object-fit:cover; border:1px solid var(--line); border-radius:2px}
.so-preview{margin-top:10px; padding:12px; border:1px solid var(--line); border-radius:2px; background:var(--paper-2)}
.so-preview-lbl{margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); font-weight:800}
.so-email-prompt input{padding:5px 8px; border:1px solid var(--line); border-radius:2px; background:var(--field-bg); color:var(--ink); font-size:13px; width:170px}
.fl-header{display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; padding-bottom:14px; border-bottom:1px solid var(--line)}
.fl-wordmark{display:flex; align-items:center; gap:11px}
.fl-logo{display:inline-flex; background:none; padding:0; line-height:0}
.fl-logo img{height:48px; width:auto; display:block; object-fit:contain}
.fl-brandtext{display:flex; flex-direction:column; line-height:1; align-items:center; text-align:center}
.fl-brandname{font-family:'Archivo',sans-serif; font-weight:800; font-size:26px; letter-spacing:-.01em; line-height:1}
.fl-rey{color:var(--amber)}
.fl-guild{color:var(--ink)}
.fl-tagline{margin:6px 0 0; font-size:9.5px; color:var(--ink-2); font-family:'JetBrains Mono',monospace; letter-spacing:.2em; text-transform:uppercase; white-space:nowrap}
@media(max-width:560px){.fl-logo img{height:38px} .fl-brandname{font-size:22px} .fl-tagline{letter-spacing:.1em}}
.fl-stats{display:flex; gap:10px}
.fl-chip{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:8px 14px; min-width:88px; text-align:center}
.fl-chip.due{background:var(--amber); border-color:var(--amber)}
.fl-chip-num{display:block; font-family:'Archivo',sans-serif; font-weight:800; font-size:24px; line-height:1}
.fl-chip-lbl{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.fl-chip.due .fl-chip-lbl{color:#fff}
.fl-chip.due .fl-chip-num{color:#fff}

.fl-nav{display:flex; gap:4px 2px; margin:16px 0 18px; border-bottom:1px solid var(--line); flex-wrap:wrap}
.fl-nav3{display:flex; align-items:stretch; gap:8px; margin:16px 0 18px; border-bottom:1px solid var(--line); padding-bottom:0}
.fl-menuwrap{position:relative}
.fl-menubtn,.fl-midtab,.fl-righttab{background:none; border:none; border-bottom:3px solid transparent; padding:11px 16px; font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); cursor:pointer; margin-bottom:-1px; white-space:nowrap}
.fl-menubtn.on,.fl-midtab.on,.fl-righttab.on{color:var(--ink); border-bottom-color:var(--amber-deep)}
.fl-menubtn{background:var(--ink); color:var(--paper-2); border-radius:3px 3px 0 0}
.fl-menubtn.on{color:var(--amber)}
.fl-menu-ic{font-size:14px} .fl-menu-car{font-size:10px; opacity:.8}
.fl-midtab{margin-left:auto} .fl-righttab{}
.fl-menu-overlay{position:fixed; inset:0; z-index:40}
.fl-menu{position:absolute; top:calc(100% + 4px); left:0; z-index:41; background:var(--paper-2); border:1px solid var(--line); border-radius:4px; box-shadow:0 8px 28px rgba(0,0,0,.18); min-width:210px; padding:6px; display:flex; flex-direction:column}
.fl-menu-item{text-align:left; background:none; border:none; padding:11px 14px; font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; color:var(--ink); cursor:pointer; border-radius:3px; text-transform:uppercase; letter-spacing:.04em}
.fl-menu-item:hover{background:var(--paper)}
.fl-menu-item.on{background:var(--ink); color:var(--amber)}
@media(max-width:560px){.fl-menubtn,.fl-midtab,.fl-righttab{padding:10px 11px; font-size:12px; letter-spacing:.03em} .fl-menu{min-width:64vw}}

.fl-grid{display:grid; grid-template-columns:380px 1fr; gap:20px; align-items:start}
@media(max-width:860px){.fl-grid{grid-template-columns:1fr}}
.fl-panel{background:var(--paper-2); border:1px solid var(--line); border-top:3px solid var(--ink); border-radius:2px; position:sticky; top:18px}
@media(max-width:860px){.fl-panel{position:static}}
@media(max-width:560px){
  .fl-root{padding:12px}
  .fl-two{grid-template-columns:1fr}
  .fl-card-actions{flex-wrap:wrap}
  .so-pay-amt{min-width:0}
  .so-sub-row{flex-wrap:wrap}
}
.fl-panel-head{display:flex; justify-content:space-between; align-items:center; padding:14px 16px; border-bottom:1px solid var(--line)}
.fl-panel-head h2{font-family:'Archivo',sans-serif; font-weight:700; font-size:15px; text-transform:uppercase; letter-spacing:.08em; margin:0}
.fl-collapse{background:none; border:none; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); cursor:pointer; text-transform:uppercase; letter-spacing:.08em}
.fl-form{padding:16px}
.fl-sub{font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.12em; color:var(--amber-deep); margin:18px 0 10px; padding-bottom:5px; border-bottom:1px dotted var(--line)}
.fl-form .fl-sub:first-child{margin-top:0}
.fl-two{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.fl-field{display:block; margin-bottom:13px}
.fl-field > span{display:block; font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:5px}
.fl-field input, .fl-field select, .fl-field textarea{width:100%; padding:9px 10px; border:1px solid var(--line); border-radius:2px; background:var(--field-bg); font-family:'Inter',sans-serif; font-size:14px; color:var(--ink)}
.fl-field input:focus, .fl-field select:focus, .fl-field textarea:focus{outline:none; border-color:var(--green); box-shadow:0 0 0 2px rgba(223,166,58,.28)}
.fl-field textarea{resize:vertical}
.fl-seg{display:flex; border:1px solid var(--line); border-radius:2px; overflow:hidden}
.fl-seg-btn{flex:1; background:var(--field-bg); border:none; border-right:1px solid var(--line); padding:9px 6px; font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; color:var(--muted); white-space:nowrap}
.fl-seg-btn:last-child{border-right:none}
.fl-seg-btn.on{background:var(--ink); color:var(--paper-2)}
.fl-error{color:var(--red); font-size:13px; margin:0 0 10px}
.fl-actions{display:flex; gap:10px; margin-top:4px}
.fl-primary{flex:1; background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:12px; font-family:'Archivo',sans-serif; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:.08em; cursor:pointer}
.fl-primary:hover{background:var(--ink-2)}
.fl-ghost{background:none; border:1px solid var(--line); border-radius:2px; padding:12px 16px; font-family:'JetBrains Mono',monospace; font-size:12px; cursor:pointer; color:var(--muted)}

.fl-toolbar{margin-bottom:16px}
.fl-search{width:100%; padding:11px 14px; border:1px solid var(--line); border-radius:2px; background:var(--paper-2); font-family:'Inter',sans-serif; font-size:14px; margin-bottom:10px}
.fl-search:focus{outline:none; border-color:var(--ink)}
.fl-filters{display:flex; flex-wrap:wrap; gap:6px}
.fl-pill{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:6px 11px; font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; color:var(--muted)}
.fl-pill.active{background:var(--ink); color:var(--paper-2); border-color:var(--ink)}

.fl-empty{border:1px dashed var(--line); border-radius:2px; padding:40px 20px; text-align:center; color:var(--muted); font-size:14px; background:var(--paper-2)}
.fl-cards{display:flex; flex-direction:column; gap:12px}
.fl-card{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:2px; padding:14px 16px}
.fl-card-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px}
.fl-card-top h3{font-family:'Archivo',sans-serif; font-weight:700; font-size:17px; margin:0}
.fl-addr{font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); margin:3px 0 0}
.fl-status{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#fff; background:var(--accent); padding:3px 8px; border-radius:2px; white-space:nowrap}
.fl-due{display:inline-block; margin-top:10px; background:var(--amber); color:var(--ink); font-family:'Archivo',sans-serif; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.1em; padding:3px 9px; border-radius:2px}
.fl-meta{display:flex; flex-wrap:wrap; gap:14px; margin-top:10px; font-size:13px; color:var(--ink-2)}
.fl-ts{font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted)}
.fl-next{margin:10px 0 0; font-size:13px; color:var(--ink-2)}
.fl-notes{margin:8px 0 0; font-size:13px; line-height:1.5; color:var(--ink-2); border-top:1px dotted var(--line); padding-top:8px}
.fl-card-foot{display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line)}
.fl-stamp{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--amber-deep); border:1px solid var(--amber-deep); padding:3px 7px; border-radius:2px}
.fl-card-actions{display:flex; gap:12px}
.fl-link{background:none; border:none; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); cursor:pointer; padding:0}
.fl-link:hover{color:var(--ink)}
.fl-link.danger{color:var(--red)}

.fl-weekly{max-width:880px}
.fl-weekbar{display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:12px 14px; margin-bottom:16px}
.fl-wk-nav{background:none; border:1px solid var(--line); border-radius:2px; padding:7px 12px; font-family:'JetBrains Mono',monospace; font-size:12px; cursor:pointer; color:var(--ink)}
.fl-wk-label{display:flex; flex-direction:column; flex:1; text-align:center}
.fl-wk-eyebrow{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted)}
.fl-wk-label strong{font-family:'Archivo',sans-serif; font-size:16px}
.fl-wk-today{background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:7px 12px; font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; text-transform:uppercase; letter-spacing:.06em}

.fl-emp-card{background:var(--paper-2); border:1px solid var(--line); border-top:3px solid var(--ink); border-radius:2px; padding:14px 16px; margin-bottom:12px}
.fl-emp-card.team{border-top-color:var(--amber-deep); background:#eef5ef}
.fl-emp-head{display:flex; justify-content:space-between; align-items:center; width:100%; margin-bottom:12px; text-align:left}
.fl-emp-head.btn{background:none; border:none; cursor:pointer; padding:0}
.fl-emp-head h3{font-family:'Archivo',sans-serif; font-weight:700; font-size:16px; margin:0; text-transform:uppercase; letter-spacing:.04em}
.fl-emp-count{font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted)}
.fl-metrics{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:2px; overflow:hidden}
@media(min-width:620px){.fl-metrics{grid-template-columns:repeat(9,1fr)}}
.fl-metric{background:var(--paper-2); padding:10px 8px; text-align:center}
.fl-metric-num{display:block; font-family:'Archivo',sans-serif; font-weight:800; font-size:22px; line-height:1; color:var(--ink)}
.fl-metric-lbl{display:block; margin-top:4px; font-family:'JetBrains Mono',monospace; font-size:9px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); line-height:1.2}
.fl-emp-detail{margin-top:12px; border-top:1px dotted var(--line); padding-top:10px}
.fl-emp-none{font-size:13px; color:var(--muted); margin:0}
.fl-emp-row{display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-bottom:1px dotted var(--line)}
.fl-emp-row:last-child{border-bottom:none}
.fl-emp-co{font-weight:600; font-size:13px}
.fl-emp-tags{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); text-align:right}
.fl-foot-note{font-size:12px; color:var(--muted); margin-top:14px; line-height:1.5}
.fl-person{display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent,var(--ink-2)); border-radius:2px; padding:12px 14px; margin-bottom:8px}
.fl-person h3{font-family:'Archivo',sans-serif; font-weight:700; font-size:16px; margin:0}
.fl-pmeta{font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--muted); margin:3px 0 0; word-break:break-word}

.fl-actas{display:flex; align-items:center; gap:6px; background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:6px 8px}
.fl-actas-lbl{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--muted)}
.fl-actas select{border:none; background:none; font-family:'Inter',sans-serif; font-size:13px; color:var(--ink); max-width:150px}
.fl-actas select:focus{outline:none}
.fl-rolebadge{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#fff; background:var(--accent); padding:3px 7px; border-radius:2px}
.fl-readonly{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--blue); border-radius:2px; padding:10px 14px; font-size:13px; color:var(--ink-2); margin:0 0 14px}
.fl-flag{display:inline-flex; align-items:center; gap:4px; background:var(--red); color:#fff; font-family:'Archivo',sans-serif; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.06em; padding:3px 9px; border-radius:2px}
.fl-card .fl-flag{margin-top:10px}

.fl-job{background:var(--paper-2); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:2px; padding:14px 16px; margin-bottom:12px}
.fl-job.flag{border-left-color:var(--red); box-shadow:inset 3px 0 0 var(--red)}
.fl-job-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px}
.fl-job-top h3{font-family:'Archivo',sans-serif; font-weight:700; font-size:17px; margin:0}
.fl-job-right{display:flex; flex-direction:column; align-items:flex-end; gap:6px}
.fl-job-bar{display:flex; align-items:center; gap:12px; margin-top:12px; font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); flex-wrap:wrap}
.fl-track{display:flex; gap:4px}
.fl-pip{width:18px; height:8px; border-radius:1px; background:var(--line)}
.fl-pip.on{background:var(--green)}
.fl-job-rep{margin-left:auto; color:var(--amber-deep)}
.fl-fu-list{margin-top:10px; border-top:1px dotted var(--line); padding-top:8px; display:flex; flex-direction:column; gap:6px}
.fl-fu-row{display:flex; gap:10px; font-size:13px}
.fl-fu-meta{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted); white-space:nowrap; min-width:130px}
.fl-fu-note{color:var(--ink-2)}
.fl-job-foot{display:flex; align-items:center; gap:14px; margin-top:12px; padding-top:10px; border-top:1px solid var(--line); flex-wrap:wrap}
.fl-job-btn{background:var(--ink); color:var(--paper-2); border:none; border-radius:2px; padding:8px 14px; font-family:'JetBrains Mono',monospace; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:.05em}
.fl-fu-form{display:flex; gap:8px; flex-wrap:wrap; align-items:center; width:100%}
.fl-fu-form input[type=date]{border:1px solid var(--line); border-radius:2px; padding:8px; font-family:'Inter',sans-serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-fu-form input:not([type]){flex:1; min-width:160px; border:1px solid var(--line); border-radius:2px; padding:8px 10px; font-family:'Inter',sans-serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.fl-fu-form .fl-seg{flex:0 0 auto}
.fl-fu-form .fl-primary{flex:0 0 auto; padding:9px 14px}
.fl-fu-form .fl-ghost{flex:0 0 auto; padding:9px 14px}

.fl-match{margin:4px 0 12px; padding:9px 11px; border-radius:2px; font-size:13px; line-height:1.4}
.fl-match.ok{background:#eaf3ed; border:1px solid var(--green); color:#235c40}
.fl-match.none{background:#fbeceb; border:1px solid var(--red); color:#8a3326}
.fl-comm-summary{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:2px; overflow:hidden; margin-bottom:10px}
.fl-comm-summary > div{background:var(--paper-2); padding:10px 8px; text-align:center}
.fl-comm-summary > div.hot{background:#eaf3ed}
.fl-comm-num{display:block; font-family:'Archivo',sans-serif; font-weight:800; font-size:18px; line-height:1.1; color:var(--ink)}
.fl-comm-lbl{display:block; margin-top:3px; font-family:'JetBrains Mono',monospace; font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted)}
.fl-comm-amt{margin-left:auto; font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--green); font-weight:700; white-space:nowrap}
.fl-hint{font-size:12px; color:var(--muted); line-height:1.45; margin:0 0 10px}
.fl-paytag{display:inline-block; background:var(--green); color:#fff; font-size:9px; letter-spacing:.06em; padding:2px 6px; border-radius:2px; margin-left:6px; vertical-align:middle}
.fl-paychip{color:var(--green); font-weight:600}
.fl-hold{font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--blue); letter-spacing:.06em}
.fl-import{background:var(--paper-2); border:1px solid var(--line); border-radius:2px; padding:14px; margin-bottom:16px}
.fl-import-head{display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px}
.fl-import-head strong{font-family:'Archivo',sans-serif; font-size:15px}
.fl-import-head span{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted)}
.fl-map{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px}
@media(max-width:560px){.fl-map{grid-template-columns:repeat(2,1fr)}}
.fl-map-field{display:flex; flex-direction:column; gap:3px}
.fl-map-field > span{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted)}
.fl-map-field select{border:1px solid var(--line); border-radius:2px; padding:7px; font-size:13px; background:var(--field-bg)}
.fl-prev{width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px}
.fl-prev th, .fl-prev td{border-bottom:1px solid var(--line); padding:6px 8px; text-align:left}
.fl-prev th{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted)}
.fl-prev .r{text-align:right}
.fl-prev td.ok{color:var(--green); font-weight:600}
.fl-prev td.no{color:var(--red)}

/* ── Print ───────────────────────────────────────────────────────────────── */
.fl-print{display:none}
@media print{
  .fl-noprint{display:none !important}
  .fl-root{background:#fff !important; padding:0 !important; color-scheme:light}
  .fl-print{display:block; color:#000; font-family:'Inter',Arial,sans-serif}
  .fl-stmt{page-break-after:always; padding:8px}
  .fl-stmt:last-child{page-break-after:auto}
  .fl-stmt-head{display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:14px}
  .fl-stmt-head h2{font-family:'Archivo',sans-serif; font-weight:800; letter-spacing:.12em; margin:0; font-size:24px}
  .fl-stmt-head p{margin:2px 0 0; font-size:12px; letter-spacing:.06em; text-transform:uppercase}
  .fl-stmt-meta{text-align:right; font-size:13px}
  .fl-stmt-meta strong{font-size:18px}
  .fl-stmt-table{width:100%; border-collapse:collapse; font-size:12px}
  .fl-stmt-table th, .fl-stmt-table td{border-bottom:1px solid #bbb; padding:7px 6px; text-align:left}
  .fl-stmt-table th{border-bottom:2px solid #000; text-transform:uppercase; font-size:10px; letter-spacing:.04em}
  .fl-stmt-table .r{text-align:right}
  .fl-stmt-table tfoot td{border-top:2px solid #000; border-bottom:none; padding-top:8px; font-size:13px}
  .fl-stmt-note{font-size:12px; margin-top:14px}
  .fl-stmt-sign{display:flex; gap:40px; margin-top:40px}
  .fl-stmt-sign span{flex:1; border-top:1px solid #000; padding-top:5px; font-size:11px; text-transform:uppercase; letter-spacing:.06em}
}

/* ── Service Ops additions: line items, totals, price table, SOPs ───────────── */
.so-line{display:grid; grid-template-columns:1fr 56px 76px auto 22px; gap:6px; align-items:center; margin-bottom:6px}
.so-line input{border:1px solid var(--line); border-radius:2px; padding:8px; font-family:'Inter',sans-serif; font-size:13px; background:var(--field-bg); color:var(--ink); width:100%}
.so-line input:focus{outline:none; border-color:var(--green); box-shadow:0 0 0 2px rgba(223,166,58,.28)}
.so-line-amt{font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--ink); text-align:right; white-space:nowrap}
.so-line-x{background:none; border:none; color:var(--muted); font-size:18px; line-height:1; cursor:pointer; padding:0}
.so-line-x:hover{color:var(--red)}

.so-totals{margin:12px 0; border:1px solid var(--line); border-radius:2px; overflow:hidden}
.so-totals > div{display:flex; justify-content:space-between; padding:8px 12px; font-size:13px; border-bottom:1px solid var(--line); background:var(--paper-2)}
.so-totals > div:last-child{border-bottom:none}
.so-totals > div span:first-child{font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted)}
.so-totals > div span:last-child{font-family:'JetBrains Mono',monospace}
.so-totals-grand{background:var(--ink) !important; color:var(--paper-2)}
.so-totals-grand span:first-child{color:var(--paper-2) !important; font-weight:700}
.so-totals-grand span:last-child{font-family:'Archivo',sans-serif !important; font-weight:800; font-size:16px}
.so-totals-margin span:last-child{color:var(--green); font-weight:700}

.so-table{width:100%; border-collapse:collapse; font-size:13px; background:var(--paper-2); border:1px solid var(--line); border-radius:2px}
.so-table th, .so-table td{border-bottom:1px solid var(--line); padding:9px 10px; text-align:left; vertical-align:top}
.so-table th{font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); border-bottom:2px solid var(--ink)}
.so-table .r{text-align:right}
.so-table td.ok{color:var(--green); font-weight:700; font-family:'JetBrains Mono',monospace}
.so-table tr:last-child td{border-bottom:none}
.so-cat{font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--muted)}

.so-sop-body{white-space:pre-wrap; font-family:'Inter',sans-serif; font-size:14px; line-height:1.6; color:var(--ink-2); margin:0}
.so-fu-due{color:var(--red) !important; font-weight:700}
a.fl-job-btn{display:inline-block; text-decoration:none}
.so-suppliers{background:var(--paper-2); border:1px solid var(--line); border-top:3px solid var(--blue); border-radius:2px; padding:12px 14px; margin-bottom:16px}
.so-sup-head{display:flex; justify-content:space-between; align-items:baseline; gap:10px; flex-wrap:wrap; margin-bottom:10px}
.so-sup-links{display:flex; flex-wrap:wrap; gap:8px; align-items:center}
.so-sup{display:inline-flex; align-items:center; gap:6px; background:var(--paper); border:1px solid var(--line); border-radius:2px; padding:4px 6px 4px 10px}
.so-sup-link{font-family:'Archivo',sans-serif; font-weight:700; font-size:13px; color:var(--ink); text-decoration:none}
.so-sup-link:hover{color:var(--blue)}
.so-sup-x{background:none; border:none; color:var(--muted); font-family:'JetBrains Mono',monospace; font-size:11px; cursor:pointer; padding:0 2px}
.so-sup-x:hover{color:var(--ink)}
.so-sup-add{display:flex; gap:8px; margin-top:10px; flex-wrap:wrap}
.so-sup-add input{flex:1; min-width:130px; border:1px solid var(--line); border-radius:2px; padding:8px 10px; font-family:'Inter',sans-serif; font-size:13px; background:var(--field-bg); color:var(--ink)}
.so-sup-add input:focus{outline:none; border-color:var(--green); box-shadow:0 0 0 2px rgba(223,166,58,.28)}

.so-match{display:flex; align-items:center; gap:10px; margin:-4px 0 4px; font-size:13px}
.so-match-ok{color:var(--green); font-weight:700}
.so-match-new{color:var(--amber-deep); font-weight:700}
.so-logo-row{display:flex; align-items:center; gap:14px}
.so-logo-prev{height:54px; width:auto; max-width:160px; object-fit:contain; border:1px solid var(--line); border-radius:2px; padding:4px; background:#fff}
.so-logo-empty{height:54px; width:120px; display:flex; align-items:center; justify-content:center; border:1px dashed var(--line); border-radius:2px; color:var(--muted); font-size:12px}
.so-letter{border-top:3px solid var(--amber)}
.so-letter-logo{height:60px; width:auto; max-width:220px; object-fit:contain; display:block; margin-bottom:8px}
.so-letter-name{margin:0 0 4px; font-size:20px}
.so-letter-line{margin:2px 0; color:var(--ink-2); font-size:14px}
.so-letter-rule{border-top:2px solid var(--ink); margin:12px 0}
.fl-chip.alert{background:var(--green); border-color:var(--green)}
.fl-chip.alert .fl-chip-lbl, .fl-chip.alert .fl-chip-num{color:#fff}
.so-outcome{display:flex; flex-direction:column; gap:8px; width:100%}
.so-outcome-date{display:flex; align-items:center; gap:8px; font-size:13px; color:var(--ink-2); font-weight:700}
.so-outcome-date input{padding:6px 8px; border:1px solid var(--line); border-radius:2px; background:#fff}
.so-outcome-btns{display:flex; gap:8px; flex-wrap:wrap}
.fl-job-btn.ok{background:var(--green); border-color:var(--green); color:#fff}
.fl-job-btn.danger{background:var(--red); border-color:var(--red); color:#fff}
.so-signed{display:flex; align-items:center; gap:12px; padding:8px 14px; border-top:1px solid var(--line); background:rgba(47,125,82,.06)}
.so-signed-lbl{font-size:12px; color:var(--green); font-weight:700}
.so-signed-img{height:36px; width:auto; max-width:160px; object-fit:contain}
.so-sign{padding:14px; border-top:2px solid var(--amber); background:var(--paper-2)}
.so-sign-title{margin:0 0 2px; font-weight:800}
.so-sign-hint{margin:0 0 8px; font-size:12px; color:var(--muted)}
.so-sign-canvas{width:100%; max-width:520px; height:150px; border:1px solid var(--line); border-radius:2px; background:#fff; touch-action:none; display:block; cursor:crosshair}
.so-sign-row{display:flex; align-items:center; gap:10px; margin:8px 0}
.so-sign-name{flex:1; max-width:300px; padding:8px 10px; border:1px solid var(--line); border-radius:2px; background:#fff}
.so-sign-actions{display:flex; gap:10px}
.so-alerts-head{display:flex; align-items:center; justify-content:space-between; margin-bottom:12px}
.so-legal{white-space:pre-wrap; font-family:'Times New Roman',Times,serif; font-size:14px; line-height:1.5; color:var(--ink-2); margin:0}
.so-pay-summary{display:flex; align-items:baseline; gap:10px; margin:6px 0 2px; flex-wrap:wrap}
.so-pay-state{font-weight:800; color:var(--amber-deep)}
.so-pay-state.done{color:var(--green)}
.so-pay-sub{font-size:13px; color:var(--muted)}
.so-pay-list{margin:4px 0; border-top:1px dashed var(--line)}
.so-pay-row{display:flex; align-items:center; gap:10px; justify-content:space-between; font-size:13px; padding:4px 0; border-bottom:1px dashed var(--line)}
.so-pay-row span:first-child{flex:1}
.so-pay-form{margin:8px 0; padding:10px; border:1px solid var(--line); border-radius:2px; background:var(--paper-2)}
.so-pay-fields{display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px}
.so-pay-fields input, .so-pay-fields select{padding:8px 10px; border:1px solid var(--line); border-radius:2px; background:#fff}
.so-pay-amt{flex:1; min-width:140px}
.so-pay-actions{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
.so-late-foot{display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:6px}
.so-late-reason{flex:1; min-width:180px; padding:8px 10px; border:1px solid var(--line); border-radius:2px; background:#fff}

/* ── ReyGuild: Times New Roman, bold, old-school document feel ──────────────── */.fl-root, .fl-root * { font-family:'Times New Roman', Times, serif !important; }
.fl-root { font-weight:600; }
.fl-root p, .fl-root span, .fl-root label, .fl-root td, .fl-root th,
.fl-root input, .fl-root select, .fl-root textarea, .fl-root button, .fl-root a,
.fl-root li, .fl-root option { font-weight:600; }
.fl-root h1, .fl-root h2, .fl-root h3,
.fl-brandname, .fl-tagline, .fl-chip-num, .fl-chip-lbl, .fl-metric-num,
.fl-primary, .fl-job-btn, .fl-status, .fl-pill, .fl-rolebadge, .fl-menubtn, .fl-midtab, .fl-righttab, .fl-menu-item,
.so-totals-grand, .fl-seg-btn { font-weight:800 !important; }
.fl-root input, .fl-root select, .fl-root textarea, .fl-root .fl-notes,
.fl-root .fl-meta { font-size:15px; }

`;
