// World Cup 2026 participating countries dataset
const countries = [
  {
    id: "arg",
    name: "Argentina",
    capital: "Buenos Aires",
    population: 45376763,
    flagUrl: "/flags/argentina.png"
  },
  {
    id: "bra",
    name: "Brazil",
    capital: "Brasília",
    population: 215313498,
    flagUrl: "/flags/brazil.png"
  },
  {
    id: "usa",
    name: "United States",
    capital: "Washington, D.C.",
    population: 331449281,
    flagUrl: "/flags/usa.png"
  },
  {
    id: "can",
    name: "Canada",
    capital: "Ottawa",
    population: 38067903,
    flagUrl: "/flags/canada.png"
  },
  {
    id: "mex",
    name: "Mexico",
    capital: "Mexico City",
    population: 127575529,
    flagUrl: "/flags/mexico.png"
  },
  {
    id: "eng",
    name: "England",
    capital: "London",
    population: 56286961,
    flagUrl: "/flags/england.png"
  },
  {
    id: "fra",
    name: "France",
    capital: "Paris",
    population: 67391582,
    flagUrl: "/flags/france.png"
  },
  {
    id: "ger",
    name: "Germany",
    capital: "Berlin",
    population: 83237124,
    flagUrl: "/flags/germany.png"
  },
  {
    id: "esp",
    name: "Spain",
    capital: "Madrid",
    population: 47351567,
    flagUrl: "/flags/spain.png"
  },
  {
    id: "ita",
    name: "Italy",
    capital: "Rome",
    population: 59554023,
    flagUrl: "/flags/italy.png"
  },
  {
    id: "ned",
    name: "Netherlands",
    capital: "Amsterdam",
    population: 17441139,
    flagUrl: "/flags/netherlands.png"
  },
  {
    id: "por",
    name: "Portugal",
    capital: "Lisbon",
    population: 10305564,
    flagUrl: "/flags/portugal.png"
  },
  {
    id: "bel",
    name: "Belgium",
    capital: "Brussels",
    population: 11555997,
    flagUrl: "/flags/belgium.png"
  },
  {
    id: "cro",
    name: "Croatia",
    capital: "Zagreb",
    population: 3871833,
    flagUrl: "/flags/croatia.png"
  },
  {
    id: "jpn",
    name: "Japan",
    capital: "Tokyo",
    population: 125416877,
    flagUrl: "/flags/japan.png"
  },
  {
    id: "kor",
    name: "South Korea",
    capital: "Seoul",
    population: 51780579,
    flagUrl: "/flags/south-korea.png"
  },
  {
    id: "aus",
    name: "Australia",
    capital: "Canberra",
    population: 25693267,
    flagUrl: "/flags/australia.png"
  },
  {
    id: "mar",
    name: "Morocco",
    capital: "Rabat",
    population: 37076584,
    flagUrl: "/flags/morocco.png"
  },
  {
    id: "sen",
    name: "Senegal",
    capital: "Dakar",
    population: 17196301,
    flagUrl: "/flags/senegal.png"
  },
  {
    id: "nga",
    name: "Nigeria",
    capital: "Abuja",
    population: 218541212,
    flagUrl: "/flags/nigeria.png"
  },
  {
    id: "uru",
    name: "Uruguay",
    capital: "Montevideo",
    population: 3485151,
    flagUrl: "/flags/uruguay.png"
  },
  {
    id: "col",
    name: "Colombia",
    capital: "Bogotá",
    population: 51265844,
    flagUrl: "/flags/colombia.png"
  },
  {
    id: "chi",
    name: "Chile",
    capital: "Santiago",
    population: 19493184,
    flagUrl: "/flags/chile.png"
  },
  {
    id: "per",
    name: "Peru",
    capital: "Lima",
    population: 33359418,
    flagUrl: "/flags/peru.png"
  },
  {
    id: "ecu",
    name: "Ecuador",
    capital: "Quito",
    population: 17888475,
    flagUrl: "/flags/ecuador.png"
  },
  {
    id: "par",
    name: "Paraguay",
    capital: "Asunción",
    population: 7252672,
    flagUrl: "/flags/paraguay.png"
  },
  {
    id: "bol",
    name: "Bolivia",
    capital: "La Paz",
    population: 11832940,
    flagUrl: "/flags/bolivia.png"
  },
  {
    id: "ven",
    name: "Venezuela",
    capital: "Caracas",
    population: 28704954,
    flagUrl: "/flags/venezuela.png"
  },
  {
    id: "den",
    name: "Denmark",
    capital: "Copenhagen",
    population: 5831404,
    flagUrl: "/flags/denmark.png"
  },
  {
    id: "swe",
    name: "Sweden",
    capital: "Stockholm",
    population: 10353442,
    flagUrl: "/flags/sweden.png"
  },
  {
    id: "nor",
    name: "Norway",
    capital: "Oslo",
    population: 5421241,
    flagUrl: "/flags/norway.png"
  },
  {
    id: "pol",
    name: "Poland",
    capital: "Warsaw",
    population: 37950802,
    flagUrl: "/flags/poland.png"
  },
  {
    id: "ukr",
    name: "Ukraine",
    capital: "Kyiv",
    population: 41902416,
    flagUrl: "/flags/ukraine.png"
  },
  {
    id: "swi",
    name: "Switzerland",
    capital: "Bern",
    population: 8703405,
    flagUrl: "/flags/switzerland.png"
  },
  {
    id: "aut",
    name: "Austria",
    capital: "Vienna",
    population: 8956604,
    flagUrl: "/flags/austria.png"
  },
  {
    id: "cze",
    name: "Czech Republic",
    capital: "Prague",
    population: 10701777,
    flagUrl: "/flags/czech-republic.png"
  },
  {
    id: "ser",
    name: "Serbia",
    capital: "Belgrade",
    population: 6834326,
    flagUrl: "/flags/serbia.png"
  },
  {
    id: "hun",
    name: "Hungary",
    capital: "Budapest",
    population: 9709891,
    flagUrl: "/flags/hungary.png"
  },
  {
    id: "wal",
    name: "Wales",
    capital: "Cardiff",
    population: 3105410,
    flagUrl: "/flags/wales.png"
  },
  {
    id: "sco",
    name: "Scotland",
    capital: "Edinburgh",
    population: 5463300,
    flagUrl: "/flags/scotland.png"
  },
  {
    id: "ire",
    name: "Ireland",
    capital: "Dublin",
    population: 4996004,
    flagUrl: "/flags/ireland.png"
  },
  {
    id: "isl",
    name: "Iceland",
    capital: "Reykjavik",
    population: 371580,
    flagUrl: "/flags/iceland.png"
  },
  {
    id: "alg",
    name: "Algeria",
    capital: "Algiers",
    population: 44616624,
    flagUrl: "/flags/algeria.png"
  },
  {
    id: "tun",
    name: "Tunisia",
    capital: "Tunis",
    population: 11935766,
    flagUrl: "/flags/tunisia.png"
  },
  {
    id: "egy",
    name: "Egypt",
    capital: "Cairo",
    population: 104258327,
    flagUrl: "/flags/egypt.png"
  },
  {
    id: "gha",
    name: "Ghana",
    capital: "Accra",
    population: 32395450,
    flagUrl: "/flags/ghana.png"
  },
  {
    id: "cmr",
    name: "Cameroon",
    capital: "Yaoundé",
    population: 27224265,
    flagUrl: "/flags/cameroon.png"
  },
  {
    id: "isr",
    name: "Israel",
    capital: "Jerusalem",
    population: 9506000,
    flagUrl: "/flags/israel.png"
  }
];

module.exports = countries;