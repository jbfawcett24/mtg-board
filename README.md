# MTG-Board

**MTG-Board** is a hybrid digital/physical Magic: The Gathering helper application built with **React** and **Electron**. It transforms your laptop into a digital game board and your smartphone into your private hand, allowing you to play with digital cards in a physical setting.

## Features

* **Dual-Screen Gameplay**: Use your laptop as the shared board and your phone as your private hand.
* **Easy Connection**: Connect your phone by simply scanning a QR code displayed on the board.
* **Deck Import**: Support for importing decks and tokens directly from Moxfield and Archidekt
* **Auto-Setup**: Automatically manages the deck folder structure for you.
* **Cross-Platform**: Compatible with Windows and Linux.

## Downloads

You can download the latest pre-built binaries for Windows and Linux from the **[Releases Page](https://github.com/jbfawcett24/mtg-board/releases)**.

## Prerequisites

If you are running the code from source (instead of using a pre-built release), you will need:

* [Node.js](https://nodejs.org/) (Latest LTS recommended)
* npm (comes with Node.js)
https://moxfield.com/decks/89zcnZK_A0mGi3Nfw7KFrg
## Setup & Installation (From Source)

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/jbfawcett24/mtg-board.git](https://github.com/jbfawcett24/mtg-board.git)
    cd mtg-board
    ```

2.  **Install Dependencies:**
    You must install dependencies for both the client (React) and the server (Electron).

    ```bash
    # Install client dependencies
    cd client
    npm install

    # Install server dependencies
    cd ../server
    npm install
    ```

## Adding Decks

The application reads decks from your computer's `Documents` folder. 

1.  **Launch the App**: When you first run the app, it will automatically create the required folder structure: `Documents/MTG-Board/Decks/`.
2. **Import Decks**: In the app, press the import deck button. Paste the url to the public/ unlisted deck from Moxfield or Archidekt.
3. **Select Deck**: Once the deck is imported, press the select deck button, select your deck, and press start game.

## Running the Application

To run the application in development mode:

1.  **Build the Client:**
    ```bash
    cd client
    npm run build
    ```

2.  **Start the Server/App:**
    ```bash
    cd ../server
    npm run start
    ```

### Connecting Your Phone
Once the application launches on your computer:
* **QR Code**: A QR code will appear on the screen. Scan it with your phone to connect instantly.
* **Manual Connection**: Alternatively, you can connect manually by navigating to your computer's IP address on port **3001** (e.g., `http://192.168.1.5:3001?role=hand`).

## Building for Distribution

To compile the application into a standalone binary:

**For Linux:**
```bash
npm run dist:linux
```
**For Windows:**
```bash
npm run dist:win
```

## Technologies
  - Frontend: React

  - Backend/Runtime: Electron, Node.js
## License

This project is licensed under the MIT License - see the LICENSE file for details.
