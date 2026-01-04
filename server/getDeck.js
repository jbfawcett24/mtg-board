const fs = require("fs");
const {getDeck} = require("./moxfieldRequest");

async function getDeckFromURL(inputUrl, filePath) {
    const urlData = inputUrl.split("/")

    const domain = urlData[2]

    let id = "";
    let type = "";
    let url = ''

    switch (domain) {
        case "archidekt.com":
            type = "Archidekt"
            id = urlData[4]
            url = `https://archidekt.com/api/decks/${id}/`
            break;
        case "moxfield.com":
            type = "Moxfield"
            id = urlData[urlData.length - 1]
            url = `https://api2.moxfield.com/v2/decks/all/${id}`
            break;
        default:
            console.log(`Unknown domain`)
            break;
    }

    const {name, deck, tokens, commanders} = await getDeck(url, type);

    if (!fs.existsSync(`${filePath}/${name}`)) {
        fs.mkdirSync(`${filePath}/${name}`);
    }

    try {
        fs.writeFileSync(`${filePath}/${name}/commanders.txt`, commanders);
        console.log("Commanders written");

        fs.writeFileSync(`${filePath}/${name}/deck.txt`, deck);
        console.log("Deck written!");

        fs.writeFileSync(`${filePath}/${name}/tokens.txt`, tokens);
        console.log("Tokens written!");
    } catch (err) {
        console.error("Error writing files:", err);
    }
}

module.exports = {getDeckFromURL};