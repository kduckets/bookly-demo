import type { Book, Format, SectionId } from "@/lib/types";

/**
 * The Bookly catalog. Every description here is original copy written for this demo.
 * Locations are assigned by section (aisle) and position (shelf letter) at the bottom of the file.
 */

export const SECTIONS: { id: SectionId; name: string; label: string; genre: string; aisle: number; blurb: string }[] = [
  {
    id: "vonnegut",
    name: "The Kilgore Trout Memorial Shelf",
    label: "Vonnegut",
    genre: "Vonnegut",
    aisle: 1,
    blurb: "Every novel and the major collections. Dog-eared on purpose.",
  },
  {
    id: "scifi",
    name: "Science Fiction",
    label: "Science Fiction",
    genre: "Science Fiction",
    aisle: 2,
    blurb: "Other worlds, other futures, the same old people.",
  },
  {
    id: "classics",
    name: "Classics",
    label: "Classics",
    genre: "Classics",
    aisle: 3,
    blurb: "Books that outlived everyone who argued about them.",
  },
  {
    id: "scitech",
    name: "Science & Technology",
    label: "Science & Technology",
    genre: "Science & Technology",
    aisle: 4,
    blurb: "How the universe works, and how we keep finding out.",
  },
  {
    id: "music",
    name: "Music Biographies",
    label: "Music Biographies",
    genre: "Music Biographies",
    aisle: 5,
    blurb: "Memoirs and biographies of the people behind the records.",
  },
];

const ALL: Format[] = ["hardcover", "paperback", "ebook"];
const PB_EB: Format[] = ["paperback", "ebook"];

type Extra = { formats?: Format[]; stock?: number; related?: string[] };

const raw: Array<{
  section: SectionId;
  id: string;
  title: string;
  author: string;
  year: number;
  subgenres: string[];
  themes: string[];
  price: number;
  description: string;
} & Extra> = [];

function bk(
  section: SectionId,
  id: string,
  title: string,
  author: string,
  year: number,
  subgenres: string[],
  themes: string[],
  price: number,
  description: string,
  extra: Extra = {},
) {
  raw.push({ section, id, title, author, year, subgenres, themes, price, description, ...extra });
}

// ─── Aisle 1: Vonnegut ──────────────────────────────────────────────────────────
const KV = "Kurt Vonnegut";
bk("vonnegut", "kv-player-piano", "Player Piano", KV, 1952, ["dystopian", "satire"], ["automation", "labor", "technology", "class", "satire"], 17.0,
  "An engineer in a fully automated company town starts to suspect that a world without work is a world without purpose.", { related: ["kv-hocus-pocus", "sf-brave-new-world", "st-alignment-problem"] });
bk("vonnegut", "kv-sirens-of-titan", "The Sirens of Titan", KV, 1959, ["space opera", "satire"], ["free will", "religion", "space", "time", "satire", "chance"], 17.0,
  "The richest man in America is flung across the solar system, only to learn that all of human history may have been a delivery errand.", { related: ["sf-hitchhikers", "kv-slaughterhouse-five", "kv-cats-cradle"] });
bk("vonnegut", "kv-mother-night", "Mother Night", KV, 1961, ["war novel", "satire"], ["war", "identity", "morality", "propaganda", "guilt"], 16.0,
  "An American spy who broadcast Nazi propaganda as cover awaits trial and wonders whether pretending to be something is the same as being it.", { related: ["kv-slaughterhouse-five", "cl-catch-22", "sf-man-in-the-high-castle"] });
bk("vonnegut", "kv-cats-cradle", "Cat's Cradle", KV, 1963, ["apocalyptic", "satire"], ["science", "religion", "apocalypse", "satire", "nuclear", "ethics"], 17.0,
  "A writer researching the day the atomic bomb fell stumbles into a Caribbean island, a made-up religion, and a substance that could freeze the world.", { related: ["kv-sirens-of-titan", "cl-candide", "st-making-atomic-bomb", "sf-canticle"] });
bk("vonnegut", "kv-god-bless-you-mr-rosewater", "God Bless You, Mr. Rosewater", KV, 1965, ["satire"], ["money", "kindness", "class", "satire", "madness"], 16.0,
  "A millionaire with a fire-department fixation decides to love the people nobody else will, and his family's lawyers decide he must be insane.", { related: ["kv-jailbird", "cl-great-gatsby", "kv-breakfast-of-champions"] });
bk("vonnegut", "kv-slaughterhouse-five", "Slaughterhouse-Five", KV, 1969, ["war novel", "science fiction", "satire"], ["war", "time", "free will", "death", "trauma", "satire"], 18.0,
  "A former POW who survived the firebombing of Dresden comes unstuck in time and drifts between his past, his present, and a zoo on another planet.", { related: ["kv-mother-night", "kv-armageddon-in-retrospect", "cl-catch-22", "sf-kindred"] });
bk("vonnegut", "kv-breakfast-of-champions", "Breakfast of Champions", KV, 1973, ["satire", "metafiction"], ["free will", "america", "madness", "art", "satire"], 17.0,
  "A car dealer's grip on reality slips just as an unread science fiction writer arrives in town, and the author himself pulls up a stool to watch.", { related: ["kv-timequake", "kv-god-bless-you-mr-rosewater", "kv-bluebeard"] });
bk("vonnegut", "kv-slapstick", "Slapstick", KV, 1976, ["satire", "apocalyptic"], ["loneliness", "family", "kindness", "apocalypse", "humor"], 16.0,
  "The last President of the United States proposes a cure for loneliness: give every citizen thousands of artificial relatives.", { related: ["kv-galapagos", "kv-deadeye-dick"] });
bk("vonnegut", "kv-jailbird", "Jailbird", KV, 1979, ["satire", "political"], ["labor", "politics", "money", "kindness", "class"], 16.0,
  "A minor Watergate figure leaves prison and wanders into a sprawling corporate plot, carrying a sermon he can't quite remember.", { related: ["kv-god-bless-you-mr-rosewater", "kv-player-piano"] });
bk("vonnegut", "kv-deadeye-dick", "Deadeye Dick", KV, 1982, ["satire"], ["guilt", "nuclear", "family", "chance"], 16.0,
  "A boy who fired one careless shot spends the rest of his life as the town's cautionary tale, until a neutron bomb rearranges the town.", { related: ["kv-slapstick", "kv-cats-cradle"] });
bk("vonnegut", "kv-galapagos", "Galápagos", KV, 1985, ["science fiction", "satire"], ["evolution", "apocalypse", "humor", "nature", "intelligence"], 17.0,
  "A ghost narrates, from a million years on, how a handful of cruise passengers became the ancestors of humanity's furry, small-brained descendants.", { related: ["st-origin-of-species", "st-selfish-gene", "kv-slapstick"] });
bk("vonnegut", "kv-bluebeard", "Bluebeard", KV, 1987, ["literary"], ["art", "war", "memory", "identity"], 17.0,
  "An aging abstract painter, pestered into writing his memoirs, keeps one locked potato barn that nobody is allowed to open.", { related: ["kv-breakfast-of-champions", "kv-mother-night"] });
bk("vonnegut", "kv-hocus-pocus", "Hocus Pocus", KV, 1990, ["satire"], ["war", "education", "class", "prison", "america"], 16.0,
  "A Vietnam veteran turned college teacher tallies the women he has loved and the people he has killed while awaiting trial for a prison break.", { related: ["kv-player-piano", "kv-jailbird"] });
bk("vonnegut", "kv-timequake", "Timequake", KV, 1997, ["metafiction", "science fiction"], ["free will", "time", "writing", "aging"], 17.0,
  "The universe hiccups and everyone must relive ten years on autopilot; the trouble starts when free will switches back on.", { stock: 0, related: ["kv-slaughterhouse-five", "kv-breakfast-of-champions"] });
bk("vonnegut", "kv-welcome-to-the-monkey-house", "Welcome to the Monkey House", KV, 1968, ["short stories"], ["technology", "equality", "satire", "love", "dystopia"], 18.0,
  "Two dozen short stories, from enforced equality to a game of chess played for real lives, written when magazines still paid the rent.", { related: ["kv-bagombo-snuff-box", "sf-fahrenheit-451"] });
bk("vonnegut", "kv-palm-sunday", "Palm Sunday", KV, 1981, ["essays", "autobiography"], ["writing", "religion", "family", "censorship"], 16.0,
  "A self-described autobiographical collage of speeches, letters, and essays, including a candid report card on his own novels.", { formats: PB_EB, related: ["kv-fates-worse-than-death", "kv-man-without-a-country"] });
bk("vonnegut", "kv-fates-worse-than-death", "Fates Worse Than Death", KV, 1991, ["essays", "autobiography"], ["war", "religion", "family", "politics"], 16.0,
  "A second autobiographical collage covering the 1980s: war, family, faith, and the things people do to each other in the name of all three.", { formats: PB_EB, related: ["kv-palm-sunday", "kv-man-without-a-country"] });
bk("vonnegut", "kv-bagombo-snuff-box", "Bagombo Snuff Box", KV, 1999, ["short stories"], ["family", "money", "humor", "america"], 17.0,
  "Early stories rescued from old magazines, full of salesmen, inventors, and small-town hopes in postwar America.", { related: ["kv-welcome-to-the-monkey-house", "kv-armageddon-in-retrospect"] });
bk("vonnegut", "kv-man-without-a-country", "A Man Without a Country", KV, 2005, ["essays", "memoir"], ["politics", "humor", "kindness", "environment", "america"], 15.0,
  "Short, cranky, tender late essays on art, technology, and the state of the nation, with hand-lettered drawings between the chapters.", { related: ["kv-palm-sunday", "kv-fates-worse-than-death"] });
bk("vonnegut", "kv-armageddon-in-retrospect", "Armageddon in Retrospect", KV, 2008, ["short stories", "war writing"], ["war", "peace", "death", "trauma"], 16.0,
  "Posthumously gathered stories and a wartime letter home, nearly all of them circling the war and the bombing he lived through.", { related: ["kv-slaughterhouse-five", "kv-mother-night"] });
bk("vonnegut", "kv-god-bless-you-dr-kevorkian", "God Bless You, Dr. Kevorkian", KV, 1999, ["short pieces", "satire"], ["death", "afterlife", "humor"], 12.0,
  "Mock radio interviews conducted on brief, assisted trips to the afterlife and back, each one about the length of a coffee break.", { formats: PB_EB, related: ["kv-man-without-a-country", "kv-timequake"] });

// ─── Aisle 2: Science Fiction ───────────────────────────────────────────────────
bk("scifi", "sf-dune", "Dune", "Frank Herbert", 1965, ["space opera", "planetary romance"], ["ecology", "religion", "power", "empire", "survival"], 19.0,
  "A noble heir is stranded on a desert planet that holds the most valuable substance in the universe, and its people have been waiting for a prophet.", { related: ["sf-foundation", "sf-left-hand-of-darkness", "sf-hyperion", "st-silent-spring"] });
bk("scifi", "sf-foundation", "Foundation", "Isaac Asimov", 1951, ["space opera"], ["empire", "history", "mathematics", "power", "science"], 17.0,
  "A mathematician predicts the fall of a galactic empire and sets up a plan to shorten the dark age that follows.", { related: ["sf-dune", "sf-canticle", "st-structure-sci-revolutions"] });
bk("scifi", "sf-left-hand-of-darkness", "The Left Hand of Darkness", "Ursula K. Le Guin", 1969, ["anthropological sf"], ["gender", "identity", "politics", "loyalty", "empathy"], 17.0,
  "An envoy to an icebound world where people have no fixed sex must learn trust before he can make any treaty stick.", { related: ["sf-dispossessed", "sf-dune", "sf-kindred"] });
bk("scifi", "sf-neuromancer", "Neuromancer", "William Gibson", 1984, ["cyberpunk"], ["AI", "technology", "crime", "identity", "computing"], 17.0,
  "A burned-out hacker gets one last job from an employer who may not be human, and the heist runs straight through cyberspace.", { related: ["sf-snow-crash", "sf-do-androids-dream", "st-alignment-problem"] });
bk("scifi", "sf-hitchhikers", "The Hitchhiker's Guide to the Galaxy", "Douglas Adams", 1979, ["comic sf"], ["absurdity", "humor", "space", "meaning"], 15.0,
  "Minutes before Earth is demolished for a bypass, an ordinary man is rescued by a friend who turns out to be a researcher for a galactic guidebook.", { related: ["kv-sirens-of-titan", "kv-cats-cradle", "cl-candide"] });
bk("scifi", "sf-fahrenheit-451", "Fahrenheit 451", "Ray Bradbury", 1953, ["dystopian"], ["censorship", "dystopia", "technology", "memory", "books"], 15.0,
  "A fireman whose job is burning books meets a curious neighbor and starts reading the very thing he's paid to destroy.", { related: ["sf-nineteen-eighty-four", "sf-brave-new-world", "kv-welcome-to-the-monkey-house"] });
bk("scifi", "sf-brave-new-world", "Brave New World", "Aldous Huxley", 1932, ["dystopian"], ["dystopia", "pleasure", "genetics", "freedom", "utopia"], 16.0,
  "In a future engineered for contentment, an outsider raised on Shakespeare asks what happiness costs when nobody is allowed to be unhappy.", { related: ["sf-nineteen-eighty-four", "sf-fahrenheit-451", "kv-player-piano"] });
bk("scifi", "sf-nineteen-eighty-four", "Nineteen Eighty-Four", "George Orwell", 1949, ["dystopian"], ["surveillance", "power", "propaganda", "language", "dystopia", "freedom"], 16.0,
  "A records clerk who rewrites history for the state starts keeping a private diary, which is itself a crime.", { related: ["sf-brave-new-world", "sf-fahrenheit-451", "kv-mother-night"] });
bk("scifi", "sf-solaris", "Solaris", "Stanisław Lem", 1961, ["philosophical sf"], ["contact", "mind", "memory", "science", "grief"], 17.0,
  "Scientists orbiting an ocean planet find their buried memories walking the station halls, and no theory explains why.", { related: ["sf-ubik", "sf-childhoods-end", "st-what-is-life"] });
bk("scifi", "sf-do-androids-dream", "Do Androids Dream of Electric Sheep?", "Philip K. Dick", 1968, ["noir sf"], ["AI", "empathy", "identity", "ecology", "religion"], 16.0,
  "A bounty hunter retiring escaped androids in a dusty, irradiated San Francisco starts to doubt the test that separates them from people.", { related: ["sf-ubik", "sf-neuromancer", "st-alignment-problem", "sf-man-in-the-high-castle"] });
bk("scifi", "sf-ubik", "Ubik", "Philip K. Dick", 1969, ["metaphysical sf"], ["reality", "time", "death", "commerce"], 16.0,
  "After a botched job on the Moon, a team of anti-psychics watches the world decay backward in time, and only a spray can seems to help.", { related: ["sf-do-androids-dream", "sf-solaris", "kv-slaughterhouse-five"] });
bk("scifi", "sf-childhoods-end", "Childhood's End", "Arthur C. Clarke", 1953, ["first contact"], ["contact", "evolution", "utopia", "religion", "apocalypse"], 16.0,
  "Benevolent aliens end war and poverty overnight, but they refuse to show their faces or explain what they are waiting for.", { related: ["sf-solaris", "kv-galapagos", "sf-foundation"] });
bk("scifi", "sf-stranger-in-a-strange-land", "Stranger in a Strange Land", "Robert A. Heinlein", 1961, ["social sf"], ["religion", "love", "freedom", "satire", "culture"], 18.0,
  "A man raised by Martians returns to Earth and finds human customs baffling, then starts a movement of his own.", { related: ["sf-moon-is-a-harsh-mistress", "kv-cats-cradle"] });
bk("scifi", "sf-snow-crash", "Snow Crash", "Neal Stephenson", 1992, ["cyberpunk", "satire"], ["language", "computing", "religion", "satire", "technology"], 18.0,
  "A pizza-delivering hacker and a teenage courier chase a virus that infects both computers and human brains through ancient language.", { related: ["sf-neuromancer", "st-information", "st-hackers"] });
bk("scifi", "sf-kindred", "Kindred", "Octavia E. Butler", 1979, ["time travel"], ["race", "time", "history", "survival", "family"], 16.0,
  "A Black writer in 1970s Los Angeles is pulled back repeatedly to an antebellum plantation to save the life of an ancestor.", { related: ["sf-parable-of-the-sower", "cl-invisible-man", "kv-slaughterhouse-five"] });
bk("scifi", "sf-parable-of-the-sower", "Parable of the Sower", "Octavia E. Butler", 1993, ["dystopian", "climate fiction"], ["religion", "ecology", "survival", "community", "dystopia"], 17.0,
  "As California collapses into fire and scarcity, a teenager with an unusual sensitivity to others' pain writes down a new faith.", { related: ["sf-kindred", "sf-dune", "st-silent-spring"] });
bk("scifi", "sf-dispossessed", "The Dispossessed", "Ursula K. Le Guin", 1974, ["utopian", "political sf"], ["utopia", "politics", "physics", "freedom", "economics"], 17.0,
  "A physicist from an anarchist moon travels to its rich capitalist twin planet, hoping his theory of time can belong to everyone.", { related: ["sf-left-hand-of-darkness", "sf-brave-new-world", "kv-player-piano"] });
bk("scifi", "sf-canticle", "A Canticle for Leibowitz", "Walter M. Miller Jr.", 1959, ["post-apocalyptic"], ["religion", "nuclear", "history", "science", "apocalypse"], 16.0,
  "Monks in a post-nuclear desert preserve scraps of lost science across centuries, watching civilization climb back toward the same cliff.", { related: ["kv-cats-cradle", "sf-foundation", "st-making-atomic-bomb"] });
bk("scifi", "sf-martian-chronicles", "The Martian Chronicles", "Ray Bradbury", 1950, ["linked stories"], ["colonialism", "loneliness", "nostalgia", "nuclear"], 15.0,
  "Linked tales of Earth's settlement of Mars, where the colonists bring their small towns and their old mistakes with them.", { related: ["sf-fahrenheit-451", "kv-sirens-of-titan"] });
bk("scifi", "sf-flowers-for-algernon", "Flowers for Algernon", "Daniel Keyes", 1966, ["soft sf"], ["intelligence", "empathy", "science", "identity", "loneliness"], 15.0,
  "Told through progress reports, a gentle man's experimental surgery makes him a genius and shows him how others have always treated him.", { formats: PB_EB, related: ["st-man-who-mistook", "sf-do-androids-dream"] });
bk("scifi", "sf-hyperion", "Hyperion", "Dan Simmons", 1989, ["space opera"], ["religion", "time", "AI", "pilgrimage", "war"], 18.0,
  "Seven pilgrims travel to meet a deadly time-bending creature, and each tells the story of why they agreed to go.", { stock: 0, related: ["sf-dune", "sf-foundation"] });
bk("scifi", "sf-stars-my-destination", "The Stars My Destination", "Alfred Bester", 1956, ["space opera"], ["revenge", "identity", "teleportation", "power"], 16.0,
  "A castaway left to die in space claws his way home with one goal, revenge, in a world where people teleport by thought.", { formats: PB_EB, related: ["sf-neuromancer", "cl-moby-dick"] });
bk("scifi", "sf-man-in-the-high-castle", "The Man in the High Castle", "Philip K. Dick", 1962, ["alternate history"], ["war", "history", "reality", "art", "fate"], 16.0,
  "In an America that lost the Second World War, a banned novel imagines that the Allies won, and some readers start believing it.", { related: ["kv-mother-night", "sf-ubik", "sf-nineteen-eighty-four"] });
bk("scifi", "sf-moon-is-a-harsh-mistress", "The Moon Is a Harsh Mistress", "Robert A. Heinlein", 1966, ["political sf"], ["AI", "revolution", "freedom", "politics"], 17.0,
  "A lunar penal colony plots independence from Earth, with a self-aware computer that loves jokes as its key co-conspirator.", { related: ["sf-stranger-in-a-strange-land", "sf-dispossessed", "sf-neuromancer"] });

// ─── Aisle 3: Classics ──────────────────────────────────────────────────────────
bk("classics", "cl-frankenstein", "Frankenstein", "Mary Shelley", 1818, ["gothic", "proto-sf"], ["science", "creation", "ethics", "loneliness", "responsibility"], 12.0,
  "A young scientist builds a living being, abandons it in horror, and spends the rest of his life outrun by what he made.", { related: ["st-alignment-problem", "kv-cats-cradle", "st-code-breaker"] });
bk("classics", "cl-catch-22", "Catch-22", "Joseph Heller", 1961, ["war novel", "satire"], ["war", "absurdity", "bureaucracy", "satire", "survival"], 18.0,
  "A bombardier tries every trick to stop flying missions, but the rule meant to protect him is written so nobody can ever use it.", { related: ["kv-slaughterhouse-five", "kv-mother-night", "cl-candide"] });
bk("classics", "cl-moby-dick", "Moby-Dick", "Herman Melville", 1851, ["adventure", "epic"], ["obsession", "nature", "religion", "fate"], 14.0,
  "A wandering sailor signs on with a captain who cares about one thing: the white whale that took his leg.", { related: ["cl-don-quixote", "sf-stars-my-destination"] });
bk("classics", "cl-great-gatsby", "The Great Gatsby", "F. Scott Fitzgerald", 1925, ["jazz age"], ["money", "class", "love", "america", "illusion"], 13.0,
  "A newcomer to Long Island watches his mysterious, lavish neighbor chase a past love across the bay.", { related: ["kv-god-bless-you-mr-rosewater", "cl-middlemarch"] });
bk("classics", "cl-don-quixote", "Don Quixote", "Miguel de Cervantes", 1605, ["picaresque", "satire"], ["illusion", "humor", "books", "chivalry", "madness"], 18.0,
  "An aging gentleman reads so many romances that he sets out as a knight, with a practical farmer as his long-suffering squire.", { formats: PB_EB, related: ["cl-candide", "cl-gullivers-travels", "cl-moby-dick"] });
bk("classics", "cl-crime-and-punishment", "Crime and Punishment", "Fyodor Dostoevsky", 1866, ["psychological"], ["guilt", "morality", "poverty", "redemption"], 15.0,
  "A broke former student convinces himself that a murder can be justified, then cannot escape his own conscience.", { related: ["cl-brothers-karamazov", "kv-mother-night"] });
bk("classics", "cl-brothers-karamazov", "The Brothers Karamazov", "Fyodor Dostoevsky", 1880, ["philosophical"], ["religion", "free will", "family", "morality", "guilt"], 19.0,
  "Three very different brothers and their monstrous father collide in a murder case that becomes an argument about God.", { related: ["cl-crime-and-punishment", "cl-middlemarch"] });
bk("classics", "cl-middlemarch", "Middlemarch", "George Eliot", 1871, ["realist"], ["marriage", "ambition", "community", "reform", "science"], 16.0,
  "An idealistic young woman and an ambitious doctor learn how a provincial town shapes, and shrinks, the lives inside it.", { formats: PB_EB, related: ["cl-pride-and-prejudice", "cl-jane-eyre"] });
bk("classics", "cl-invisible-man", "Invisible Man", "Ralph Ellison", 1952, ["modernist"], ["race", "identity", "america", "politics"], 17.0,
  "An unnamed narrator tells, from an underground room, how a lifetime of other people's expectations made him unseen.", { related: ["sf-kindred", "cl-grapes-of-wrath"] });
bk("classics", "cl-candide", "Candide", "Voltaire", 1759, ["satire", "philosophical"], ["optimism", "satire", "religion", "war", "absurdity"], 11.0,
  "A cheerful young man taught that this is the best of all worlds is dragged through every disaster the century can offer.", { formats: PB_EB, related: ["kv-cats-cradle", "cl-gullivers-travels", "sf-hitchhikers"] });
bk("classics", "cl-gullivers-travels", "Gulliver's Travels", "Jonathan Swift", 1726, ["satire", "fantasy voyage"], ["satire", "politics", "science", "human nature"], 12.0,
  "A ship's surgeon visits tiny people, giants, floating scientists, and wise horses, and comes home unable to stand his own species.", { formats: PB_EB, related: ["cl-candide", "cl-don-quixote", "kv-galapagos"] });
bk("classics", "cl-the-trial", "The Trial", "Franz Kafka", 1925, ["modernist"], ["bureaucracy", "guilt", "absurdity", "power"], 14.0,
  "A bank officer is arrested one morning for a crime nobody will name, and the court that holds his case seems to be everywhere.", { formats: PB_EB, related: ["cl-catch-22", "sf-nineteen-eighty-four"] });
bk("classics", "cl-pride-and-prejudice", "Pride and Prejudice", "Jane Austen", 1813, ["romance", "comedy of manners"], ["love", "class", "family", "marriage"], 11.0,
  "A sharp-tongued second daughter and a proud, wealthy gentleman get each other wrong for most of a very funny book.", { related: ["cl-jane-eyre", "cl-middlemarch"] });
bk("classics", "cl-jane-eyre", "Jane Eyre", "Charlotte Brontë", 1847, ["gothic", "bildungsroman"], ["independence", "love", "class", "religion"], 12.0,
  "A plain, fierce governess falls for her employer and discovers that his house is keeping a secret upstairs.", { related: ["cl-pride-and-prejudice", "cl-frankenstein"] });
bk("classics", "cl-war-and-peace", "War and Peace", "Leo Tolstoy", 1869, ["historical", "epic"], ["war", "history", "free will", "family", "love"], 22.0,
  "Several aristocratic families live, love, and fight through Napoleon's invasion of Russia while the author argues with history itself.", { related: ["kv-slaughterhouse-five", "cl-brothers-karamazov"] });
bk("classics", "cl-grapes-of-wrath", "The Grapes of Wrath", "John Steinbeck", 1939, ["social realism"], ["labor", "poverty", "family", "ecology", "class"], 17.0,
  "A family pushed off their farm by dust and debt drives west toward California, where the work and the welcome prove scarce.", { related: ["kv-player-piano", "cl-invisible-man"] });
bk("classics", "cl-mrs-dalloway", "Mrs Dalloway", "Virginia Woolf", 1925, ["modernist"], ["time", "memory", "war", "trauma", "mind"], 13.0,
  "One June day in London, a society hostess prepares a party while a shell-shocked veteran walks the same streets.", { formats: PB_EB, related: ["kv-slaughterhouse-five", "cl-middlemarch"] });
bk("classics", "cl-huckleberry-finn", "Adventures of Huckleberry Finn", "Mark Twain", 1884, ["picaresque"], ["freedom", "race", "morality", "humor", "america"], 12.0,
  "A runaway boy and an escaped enslaved man drift down the Mississippi, and the boy's conscience keeps arguing with his upbringing.", { related: ["cl-candide", "kv-breakfast-of-champions"] });

// ─── Aisle 4: Science & Technology ─────────────────────────────────────────────
bk("scitech", "st-cosmos", "Cosmos", "Carl Sagan", 1980, ["astronomy"], ["cosmos", "science", "history", "wonder"], 20.0,
  "A tour of the universe from the first atoms to the people who learned to read them, written to make wonder feel like common sense.", { related: ["st-pale-blue-dot", "st-brief-history-of-time", "st-demon-haunted-world"] });
bk("scitech", "st-brief-history-of-time", "A Brief History of Time", "Stephen Hawking", 1988, ["physics", "cosmology"], ["cosmos", "time", "physics", "black holes"], 19.0,
  "Black holes, the big bang, and the direction of time, explained with almost no equations and a lot of nerve.", { related: ["st-cosmos", "st-elegant-universe"] });
bk("scitech", "st-selfish-gene", "The Selfish Gene", "Richard Dawkins", 1976, ["evolutionary biology"], ["evolution", "genetics", "biology", "altruism"], 18.0,
  "A gene's-eye view of evolution that explains cooperation, conflict, and why living things behave as if they were built by replicators.", { related: ["st-origin-of-species", "st-the-gene", "kv-galapagos"] });
bk("scitech", "st-godel-escher-bach", "Gödel, Escher, Bach", "Douglas Hofstadter", 1979, ["mathematics", "cognitive science"], ["mind", "mathematics", "AI", "music", "art", "self-reference"], 26.0,
  "Dialogues, puzzles, and fugues that braid logic, art, and music into one long question: how does a mind emerge from mechanism?", { related: ["st-information", "st-dream-machine", "st-code"] });
bk("scitech", "st-structure-sci-revolutions", "The Structure of Scientific Revolutions", "Thomas S. Kuhn", 1962, ["philosophy of science"], ["science", "history", "philosophy", "paradigms"], 16.0,
  "Why science does not just pile up facts, but lurches from one worldview to the next when the old one stops working.", { formats: PB_EB, related: ["st-double-helix", "sf-foundation"] });
bk("scitech", "st-surely-youre-joking", "Surely You're Joking, Mr. Feynman!", "Richard P. Feynman", 1985, ["memoir", "physics"], ["curiosity", "humor", "physics", "science"], 17.0,
  "A Nobel physicist's stories of safecracking, drumming, and asking stupid questions until they turn out to be good ones.", { related: ["st-making-atomic-bomb", "st-cosmos"] });
bk("scitech", "st-making-atomic-bomb", "The Making of the Atomic Bomb", "Richard Rhodes", 1986, ["history of science"], ["nuclear", "war", "physics", "ethics", "history"], 24.0,
  "From the first ideas about the atom to Hiroshima, the people, politics, and physics behind the most consequential invention of the century.", { related: ["kv-cats-cradle", "sf-canticle", "st-surely-youre-joking"] });
bk("scitech", "st-silent-spring", "Silent Spring", "Rachel Carson", 1962, ["environment"], ["ecology", "environment", "chemistry", "activism"], 16.0,
  "A biologist documents how pesticides move through soil, water, and birds, and in doing so starts a movement.", { related: ["sf-parable-of-the-sower", "sf-dune", "st-origin-of-species"] });
bk("scitech", "st-the-gene", "The Gene: An Intimate History", "Siddhartha Mukherjee", 2016, ["genetics", "history of science"], ["genetics", "family", "history", "ethics", "medicine"], 20.0,
  "The story of heredity from monastery pea plants to gene editing, braided with the author's own family history.", { related: ["st-code-breaker", "st-double-helix", "st-emperor-of-all-maladies"] });
bk("scitech", "st-code-breaker", "The Code Breaker", "Walter Isaacson", 2021, ["biography", "biotech"], ["genetics", "ethics", "innovation", "medicine"], 20.0,
  "A biography of a biochemist at the center of CRISPR, and of the races and arguments that came with learning to edit genes.", { related: ["st-the-gene", "st-innovators", "cl-frankenstein"] });
bk("scitech", "st-innovators", "The Innovators", "Walter Isaacson", 2014, ["history of computing"], ["computing", "innovation", "collaboration", "technology"], 20.0,
  "The collaborative history of the digital revolution, from Ada Lovelace's notes to the people who built the web.", { related: ["st-dream-machine", "st-hackers", "st-soul-of-a-new-machine"] });
bk("scitech", "st-hackers", "Hackers", "Steven Levy", 1984, ["history of computing"], ["computing", "culture", "freedom", "technology"], 18.0,
  "The tinkerers, students, and garage builders who wrote an ethic of open access into the first decades of personal computing.", { related: ["st-innovators", "st-soul-of-a-new-machine", "sf-snow-crash"] });
bk("scitech", "st-soul-of-a-new-machine", "The Soul of a New Machine", "Tracy Kidder", 1981, ["reportage"], ["computing", "labor", "engineering", "technology"], 17.0,
  "An inside account of an exhausted engineering team racing to build a new minicomputer, and of why people work that hard.", { related: ["st-hackers", "st-mythical-man-month", "kv-player-piano"] });
bk("scitech", "st-dream-machine", "The Dream Machine", "M. Mitchell Waldrop", 2001, ["history of computing"], ["computing", "innovation", "AI", "networks"], 22.0,
  "How one psychologist's vision of people and computers thinking together seeded interactive computing and the internet.", { stock: 0, related: ["st-innovators", "st-godel-escher-bach", "st-information"] });
bk("scitech", "st-thinking-fast-and-slow", "Thinking, Fast and Slow", "Daniel Kahneman", 2011, ["psychology"], ["mind", "decision making", "bias", "economics"], 19.0,
  "A tour of the two systems that run our judgments, and of the predictable ways intuition fools the person who owns it.", { related: ["st-man-who-mistook", "st-alignment-problem"] });
bk("scitech", "st-alignment-problem", "The Alignment Problem", "Brian Christian", 2020, ["AI", "ethics"], ["AI", "ethics", "machine learning", "technology"], 20.0,
  "Reporting on the researchers trying to make machine learning systems do what we actually mean, rather than what we accidentally said.", { related: ["st-human-compatible", "kv-player-piano", "sf-do-androids-dream", "cl-frankenstein"] });
bk("scitech", "st-information", "The Information", "James Gleick", 2011, ["history of science"], ["information", "language", "computing", "mathematics"], 19.0,
  "From talking drums to genetic code, a history of how people came to see information as the stuff the world is made of.", { related: ["st-godel-escher-bach", "st-code", "st-chaos"] });
bk("scitech", "st-what-is-life", "What Is Life?", "Erwin Schrödinger", 1944, ["physics", "biology"], ["biology", "physics", "genetics", "philosophy"], 13.0,
  "A physicist's short, influential lectures asking how living things keep order in a universe that tends toward disorder.", { formats: PB_EB, related: ["st-double-helix", "st-the-gene"] });
bk("scitech", "st-double-helix", "The Double Helix", "James D. Watson", 1968, ["memoir", "history of science"], ["genetics", "ambition", "science", "rivalry"], 15.0,
  "A brash first-person account of the race to find DNA's structure, as notable for what it reveals about its author as about the molecule.", { formats: PB_EB, related: ["st-what-is-life", "st-the-gene", "st-structure-sci-revolutions"] });
bk("scitech", "st-emperor-of-all-maladies", "The Emperor of All Maladies", "Siddhartha Mukherjee", 2010, ["medicine", "history"], ["medicine", "illness", "history", "science"], 20.0,
  "A biography of cancer, from ancient descriptions to modern trials, told by an oncologist who sits with patients every week.", { related: ["st-the-gene", "st-henrietta-lacks"] });
bk("scitech", "st-pale-blue-dot", "Pale Blue Dot", "Carl Sagan", 1994, ["astronomy"], ["cosmos", "humility", "space", "exploration"], 18.0,
  "A case for human space exploration that starts with a single faint pixel of Earth seen from the edge of the solar system.", { related: ["st-cosmos", "kv-sirens-of-titan"] });
bk("scitech", "st-demon-haunted-world", "The Demon-Haunted World", "Carl Sagan", 1995, ["skepticism"], ["science", "skepticism", "education", "democracy"], 18.0,
  "A defense of scientific thinking as a candle in the dark, with a practical kit for spotting nonsense.", { related: ["st-cosmos", "st-structure-sci-revolutions", "kv-cats-cradle"] });
bk("scitech", "st-chaos", "Chaos", "James Gleick", 1987, ["mathematics", "physics"], ["chaos", "mathematics", "weather", "complexity"], 18.0,
  "The scientists who noticed that simple rules can produce wildly unpredictable behavior, from dripping faucets to the weather.", { related: ["st-information", "st-elegant-universe"] });
bk("scitech", "st-elegant-universe", "The Elegant Universe", "Brian Greene", 1999, ["physics"], ["physics", "cosmos", "string theory", "time"], 19.0,
  "A clear tour through relativity, quantum mechanics, and the hope that tiny vibrating strings could reconcile the two.", { related: ["st-brief-history-of-time", "st-chaos"] });
bk("scitech", "st-mythical-man-month", "The Mythical Man-Month", "Frederick P. Brooks Jr.", 1975, ["software engineering"], ["computing", "management", "engineering", "teams"], 22.0,
  "Essays on why adding people to a late software project makes it later, and other lessons that keep being relearned.", { formats: PB_EB, related: ["st-soul-of-a-new-machine", "st-code"] });
bk("scitech", "st-code", "Code", "Charles Petzold", 1999, ["computing"], ["computing", "language", "engineering", "information"], 22.0,
  "Starting with flashlights and Morse code, a patient build-up to how a computer actually works, one switch at a time.", { related: ["st-information", "st-godel-escher-bach", "st-innovators"] });
bk("scitech", "st-origin-of-species", "On the Origin of Species", "Charles Darwin", 1859, ["natural history"], ["evolution", "nature", "biology", "science"], 14.0,
  "The careful, evidence-stacked argument that species change over time through natural selection.", { formats: PB_EB, related: ["kv-galapagos", "st-selfish-gene", "st-silent-spring"] });
bk("scitech", "st-man-who-mistook", "The Man Who Mistook His Wife for a Hat", "Oliver Sacks", 1985, ["neurology", "case studies"], ["mind", "medicine", "identity", "empathy"], 17.0,
  "A neurologist's humane case stories of patients whose brains reshape their worlds in startling ways.", { related: ["st-thinking-fast-and-slow", "sf-flowers-for-algernon"] });
bk("scitech", "st-human-compatible", "Human Compatible", "Stuart Russell", 2019, ["AI"], ["AI", "ethics", "control", "technology"], 19.0,
  "An AI researcher argues that machines should be built to stay uncertain about what we want, and explains why that matters.", { related: ["st-alignment-problem", "sf-moon-is-a-harsh-mistress"] });
bk("scitech", "st-henrietta-lacks", "The Immortal Life of Henrietta Lacks", "Rebecca Skloot", 2010, ["medicine", "biography"], ["medicine", "race", "ethics", "family", "science"], 18.0,
  "The woman whose cells became a pillar of modern research without her knowledge, and her family's long search for answers.", { related: ["st-emperor-of-all-maladies", "st-the-gene"] });

// ─── Aisle 5: Music Biographies ───────────────────────────────────────────────
bk("music", "mu-just-kids", "Just Kids", "Patti Smith", 2010, ["memoir"], ["music", "art", "friendship", "new york", "youth", "poetry"], 17.0,
  "Two broke young artists in late-sixties New York promise to look after each other, and keep that promise long after they stop being a couple.", { related: ["mu-girl-in-a-band", "mu-face-it", "mu-chronicles"] });
bk("music", "mu-chronicles", "Chronicles: Volume One", "Bob Dylan", 2004, ["memoir"], ["music", "fame", "new york", "songwriting", "memory"], 17.0,
  "A famously private songwriter skips around his own story, lingering on cold apartments, borrowed records, and how a song gets made.", { related: ["mu-just-kids", "mu-testimony", "mu-born-to-run"] });
bk("music", "mu-life", "Life", "Keith Richards", 2010, ["memoir"], ["music", "rock", "fame", "addiction", "friendship"], 19.0,
  "A guitarist who was expected to die young explains, cheerfully and in detail, how he didn't.", { related: ["mu-room-full-of-mirrors", "mu-scar-tissue", "mu-shout"] });
bk("music", "mu-born-to-run", "Born to Run", "Bruce Springsteen", 2016, ["memoir"], ["music", "family", "work", "depression", "america"], 20.0,
  "A singer from a small New Jersey town traces his songs back to his father's kitchen table, and admits to the dark spells behind the stadium shows.", { related: ["mu-chronicles", "mu-testimony", "cl-grapes-of-wrath"] });
bk("music", "mu-scar-tissue", "Scar Tissue", "Anthony Kiedis", 2004, ["memoir"], ["music", "addiction", "recovery", "fame", "los angeles"], 18.0,
  "A frontman's unvarnished account of a band's rise and the addiction that kept nearly taking him out of it.", { related: ["mu-life", "mu-heavier-than-heaven"] });
bk("music", "mu-miles", "Miles: The Autobiography", "Miles Davis", 1989, ["memoir", "jazz"], ["music", "jazz", "race", "reinvention", "genius"], 19.0,
  "The trumpeter talks through five decades of reinventing jazz, sparing no one, least of all himself.", { related: ["mu-thelonious-monk", "mu-beneath-the-underdog", "mu-lady-sings-the-blues"] });
bk("music", "mu-beneath-the-underdog", "Beneath the Underdog", "Charles Mingus", 1971, ["memoir", "jazz"], ["music", "jazz", "race", "identity", "anger"], 17.0,
  "A bassist and composer writes his life as a wild, half-invented novel about race, music, and wanting to be seen whole.", { formats: PB_EB, related: ["mu-miles", "cl-invisible-man"] });
bk("music", "mu-lady-sings-the-blues", "Lady Sings the Blues", "Billie Holiday", 1956, ["memoir", "jazz"], ["music", "jazz", "race", "addiction", "survival"], 15.0,
  "A singer tells her own story in her own clipped, unsentimental voice, from a hard Baltimore childhood to the top of the bill and the courtroom.", { formats: PB_EB, related: ["mu-respect", "mu-miles"] });
bk("music", "mu-girl-in-a-band", "Girl in a Band", "Kim Gordon", 2015, ["memoir"], ["music", "art", "gender", "new york", "marriage"], 17.0,
  "A bassist and artist looks back on thirty years in an influential noise band, and on what it meant to be the woman on that stage.", { related: ["mu-hunger-makes-me", "mu-just-kids", "mu-face-it"] });
bk("music", "mu-hunger-makes-me", "Hunger Makes Me a Modern Girl", "Carrie Brownstein", 2015, ["memoir"], ["music", "punk", "identity", "gender", "performance"], 17.0,
  "A guitarist from the Pacific Northwest punk scene writes about fandom, the need to be heard, and the cost of living on stage.", { related: ["mu-girl-in-a-band", "mu-face-it"] });
bk("music", "mu-coal-miners-daughter", "Coal Miner's Daughter", "Loretta Lynn", 1976, ["memoir", "country"], ["music", "country", "family", "poverty", "marriage"], 15.0,
  "A country singer from a Kentucky hollow tells how a teenage bride with a cheap guitar ended up writing songs no radio station could ignore.", { formats: PB_EB, related: ["mu-born-to-run", "mu-respect"] });
bk("music", "mu-testimony", "Testimony", "Robbie Robertson", 2016, ["memoir"], ["music", "rock", "friendship", "identity", "road"], 19.0,
  "A guitarist and songwriter recalls backing a famous folk singer's turn to electric, and the brotherhood and breakup of his own band.", { related: ["mu-chronicles", "mu-born-to-run"] });
bk("music", "mu-kill-em-and-leave", "Kill 'Em and Leave", "James McBride", 2016, ["biography"], ["music", "soul", "race", "america", "money"], 18.0,
  "A novelist goes looking for the real man behind a soul legend, and finds a story about the South, money, and who gets remembered.", { related: ["mu-respect", "mu-last-train-to-memphis"] });
bk("music", "mu-last-train-to-memphis", "Last Train to Memphis", "Peter Guralnick", 1994, ["biography"], ["music", "rock", "fame", "youth", "america"], 22.0,
  "The first half of a rock idol's life, told with care from a shy Memphis teenager's first recording to the edge of superstardom.", { related: ["mu-kill-em-and-leave", "mu-shout"] });
bk("music", "mu-shout", "Shout!", "Philip Norman", 1981, ["biography"], ["music", "rock", "fame", "friendship", "britain"], 20.0,
  "A biography of four young men from Liverpool and the strange decade in which they became the most famous people alive.", { related: ["mu-life", "mu-last-train-to-memphis"] });
bk("music", "mu-room-full-of-mirrors", "Room Full of Mirrors", "Charles R. Cross", 2005, ["biography"], ["music", "rock", "genius", "fame", "death"], 18.0,
  "The short life of a guitarist who reinvented the instrument, from a lonely Seattle childhood to a few blazing years at the top.", { related: ["mu-heavier-than-heaven", "mu-life"] });
bk("music", "mu-heavier-than-heaven", "Heavier Than Heaven", "Charles R. Cross", 2001, ["biography"], ["music", "grunge", "fame", "addiction", "depression"], 18.0,
  "A careful biography of a reluctant rock star from a small Washington town, built from his own journals and the people who knew him.", { related: ["mu-room-full-of-mirrors", "mu-scar-tissue"] });
bk("music", "mu-thelonious-monk", "Thelonious Monk", "Robin D. G. Kelley", 2009, ["biography", "jazz"], ["music", "jazz", "genius", "family", "race"], 22.0,
  "A historian corrects the myth of the eccentric jazz pianist, showing a devoted family man and a rigorous, misunderstood composer.", { related: ["mu-miles", "mu-beneath-the-underdog"] });
bk("music", "mu-respect", "Respect", "David Ritz", 2014, ["biography", "soul"], ["music", "soul", "gospel", "fame", "family"], 19.0,
  "A biography of a gospel prodigy turned soul queen, drawing on the family, musicians, and friends who saw what the public didn't.", { related: ["mu-lady-sings-the-blues", "mu-kill-em-and-leave"] });
bk("music", "mu-face-it", "Face It", "Debbie Harry", 2019, ["memoir"], ["music", "punk", "new york", "fame", "art"], 18.0,
  "A singer from the downtown New York scene tells how a band from a dirty club stage became a pop phenomenon, with art from her fans throughout.", { related: ["mu-just-kids", "mu-girl-in-a-band"] });

// ─── Assemble: locations, formats, stock, related ──────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const CATALOG: Book[] = (() => {
  return raw.map((r) => {
    const sec = SECTIONS.find((s) => s.id === r.section)!;
    return {
      id: r.id,
      title: r.title,
      author: r.author,
      year: r.year,
      genre: sec.genre,
      section: r.section,
      subgenres: r.subgenres,
      themes: r.themes,
      description: r.description,
      price: r.price,
      formats: r.formats ?? ALL,
      stock: r.stock ?? 2 + (hash(r.id) % 12),
      location: { aisle: sec.aisle },
      relatedIds: r.related ?? [],
    } satisfies Book;
  });
})();

export const BOOKS_BY_ID = new Map(CATALOG.map((b) => [b.id, b]));

export function getBook(id: string): Book | undefined {
  return BOOKS_BY_ID.get(id);
}

/** Hardcover costs more, ebooks cost less. Paperback is the list price. */
export function formatPrice(book: Book, format: string): number {
  if (format === "hardcover") return round2(book.price + 9);
  if (format === "ebook") return round2(Math.max(4.99, book.price - 5.01));
  return round2(book.price - 0.01);
}

export function locationLabel(book: Book): string {
  return `Aisle ${book.location.aisle} · ${SECTIONS.find((s) => s.aisle === book.location.aisle)?.label}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
