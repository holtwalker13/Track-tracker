/** Fake roster names so demo data never shows real student identities. */

export const FEMALE_FIRST = [
  "Jane", "Emma", "Olivia", "Ava", "Sophia", "Mia", "Chloe", "Lily", "Grace", "Nora",
  "Ella", "Zoe", "Ruby", "Ivy", "Hazel", "Stella", "Willow", "Luna", "Violet", "Clara",
  "Alice", "Hannah", "Natalie", "Claire", "Brooke", "Paige", "Sadie", "Quinn", "Riley", "Avery",
  "Peyton", "Skylar", "Harper", "Scarlett", "Aurora", "Penelope", "Daisy", "Iris", "June", "Rose",
] as const;

export const FEMALE_LAST = [
  "Doe", "Ames", "Blake", "Cole", "Drew", "Ellis", "Frost", "Glenn", "Hayes", "Ingram",
  "Jules", "Knox", "Lane", "Moss", "Nash", "Oakley", "Pike", "Reed", "Shaw", "Trent",
  "Vale", "West", "Young", "Brooks", "Carter", "Dalton", "Everett", "Flynn", "Grant", "Holt",
] as const;

export const MALE_FIRST = [
  "Aiden", "Bennett", "Caleb", "Drew", "Eli", "Finn", "Grant", "Hunter", "Isaac", "Jonah",
  "Kaden", "Landon", "Mason", "Nolan", "Owen", "Parker", "Quinn", "Ryder", "Silas", "Tucker",
  "Wesley", "Xander", "Yale", "Zane", "Brady", "Colton", "Declan", "Emmett", "Felix", "Graham",
  "Holden", "Jasper", "Knox", "Luca", "Miles", "Nash", "Oscar", "Pierce", "Roman", "Theo",
] as const;

export const MALE_LAST = [
  "Adler", "Brooks", "Carson", "Dalton", "Ellis", "Foster", "Griffin", "Hayes", "Ingram", "Jensen",
  "Keller", "Lawson", "Madden", "Norris", "Palmer", "Reeves", "Sutton", "Trent", "Vaughn", "Walker",
  "Barrett", "Collins", "Dunn", "Everett", "Farley", "Gibson", "Hale", "Iverson", "Keene", "Lang",
] as const;

export function syntheticName(
  gender: "F" | "M",
  index: number,
  offset = 0
): { firstName: string; lastName: string } {
  const first = gender === "F" ? FEMALE_FIRST : MALE_FIRST;
  const last = gender === "F" ? FEMALE_LAST : MALE_LAST;
  const i = index + offset;
  return {
    firstName: first[i % first.length]!,
    lastName: last[Math.floor(i / first.length) % last.length]!,
  };
}
