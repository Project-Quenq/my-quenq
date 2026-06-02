import { sqlite } from "../db/client.js";
import { saveSetting, settingExists } from "../db/settings.js";
import type { AutomodAction, AutomodPatternType, AutomodScope } from "../../automodPolicy.js";

type DefaultAutomodRule = {
  name: string;
  pattern: string;
  patternType: AutomodPatternType;
  scope: AutomodScope;
  action: AutomodAction;
};

const defaultAutomodRulesInstallKey = "automod.default_rules.installed";

// Keep these source lists split by moderation intent so contributors can review
// high-confidence rejects separately from review-only phrases.
const hateSlurs: string[] = [
  "nigger",
  "nigga",
  "coon",
  "jigaboo",
  "porch monkey",
  "jungle bunny",
  "spear chucker",
  "tar baby",
  "kike",
  "hebe",
  "sheeny",
  "oven dodger",
  "spic",
  "spick",
  "beaner",
  "wetback",
  "tacohead",
  "chink",
  "gook",
  "zipperhead",
  "paki",
  "curry muncher",
  "raghead",
  "towelhead",
  "camel jockey",
  "prairie nigger",
  "wagon burner",
  "gyppo",
  "faggot",
  "tranny",
  "shemale",
  "troon"
];

const reviewOnlySlurs: string[] = [
  "retard",
  "mongoloid",
  "retarded",
  "spaz",
  "cripple",
  "jap",
  "nip",
  "redskin",
  "gypsy",
  "dyke",
  "fag",
  "hermaphrodite",
  "trap",
  "groomer"
];

const hateAbusePhrases: string[] = [
  "white power",
  "blood and soil",
  "1488",
  "heil hitler",
  "jews will not replace us",
  "gas the jews",
  "globalist cabal",
  "jewish cabal",
  "zionist occupied government",
  "white genocide",
  "great replacement",
  "race war now",
  "go back to your country",
  "race traitor",
  "mud people",
  "subhuman race",
  "inferior race",
  "deport all muslims",
  "deport all jews",
  "deport all black people",
  "kill all jews",
  "kill all black people",
  "kill all muslims",
  "kill all gays",
  "kill all trans people",
  "gas all jews",
  "burn down synagogues",
  "bomb a mosque",
  "shoot up a synagogue",
  "shoot up a mosque"
];

const harassmentThreatPhrases: string[] = [
  "i will kill you",
  "i am going to kill you",
  "i'm going to kill you",
  "im going to kill you",
  "i'm gonna kill you",
  "im gonna kill you",
  "i will murder you",
  "murder you",
  "shoot you",
  "stab you",
  "beat you up",
  "break your neck",
  "burn your house down",
  "dox you",
  "doxx you",
  "find your address",
  "post your address",
  "leak your address",
  "leak your phone number",
  "swat you",
  "send cops to your house",
  "rape you"
];

const spamScamPhrases: string[] = [
  "buy followers",
  "cheap followers",
  "free instagram followers",
  "1000 followers",
  "gain followers fast",
  "boost your followers",
  "instagram growth service",
  "double your bitcoin",
  "guaranteed crypto returns",
  "risk free crypto",
  "crypto giveaway",
  "claim free crypto",
  "free nft mint",
  "airdrop claim",
  "connect your wallet to claim",
  "validate your wallet",
  "wallet verification",
  "send seed phrase",
  "share your seed phrase",
  "send recovery phrase",
  "share recovery phrase",
  "guaranteed profit",
  "forex signals",
  "whatsapp investment",
  "click here to claim prize",
  "you have won a prize",
  "verify your account now",
  "urgent account verification",
  "cheap viagra"
];

const defaultAutomodRules: DefaultAutomodRule[] = [
  keywordListRule("Default pack: hate slurs", hateSlurs, "reject"),
  keywordListRule("Default pack: review slurs", reviewOnlySlurs, "review"),
  keywordListRule("Default pack: hate abuse", hateAbusePhrases, "review"),
  keywordListRule("Default pack: harassment threats", harassmentThreatPhrases, "review"),
  keywordListRule("Default pack: spam scams", spamScamPhrases, "reject")
];

export function installDefaultAutomodRules() {
  if (settingExists(defaultAutomodRulesInstallKey)) return;

  sqlite.transaction(() => {
    if (settingExists(defaultAutomodRulesInstallKey)) return;
    insertDefaultRules(defaultAutomodRules);
    saveSetting(defaultAutomodRulesInstallKey, new Date().toISOString());
  })();
}

function keywordListRule(name: string, terms: string[], action: AutomodAction): DefaultAutomodRule {
  return {
    name,
    pattern: terms.join("\n"),
    patternType: "keyword",
    scope: "all",
    action
  };
}

function insertDefaultRules(rules: DefaultAutomodRule[]) {
  const insertRule = sqlite.prepare(
    `INSERT INTO automod_rules (name, pattern, pattern_type, scope, action, enabled, created_by)
    VALUES (?, ?, ?, ?, ?, ?, NULL)`
  );
  for (const rule of rules) insertRule.run(rule.name, rule.pattern, rule.patternType, rule.scope, rule.action, 1);
}
