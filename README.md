# BetterBahn

BetterBahn is a web app for finding the best train journeys in Germany. While split ticketing is supported to help save money, it is rather the exception. The app will be extended with many more features in the future.
You can find out more about the project on our [website](https://betterbahn.de).

## Technology

This project uses the [db-vendo-client](https://github.com/public-transport/db-vendo-client) for accessing Deutsche Bahn ticketing data, which is licensed under the ISC License.

## Legal Notice

This is not an official repository or project of Deutsche Bahn AG. It is an independent project and not affiliated with or endorsed by Deutsche Bahn. To use this code or the db-vendo-client permission from the Deutsche Bahn AG is necessary.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/)
- [pnpm](https://pnpm.io/) (see below for installation)
- [git](https://git-scm.com/)

### To run the project locally

1. Clone the repository and navigate to the folder

   ```shell
   git clone https://github.com/l2xu/betterbahn.git
   cd betterbahn
   ```

2. Install dependencies with `pnpm install`

   You can install pnpm via corepack (included with Node.js):

   ```shell
   corepack enable
   corepack prepare pnpm@latest --activate
   ```

   or via npm:

   ```shell
   npm install -g pnpm@latest-10
   ```

   then run `pnpm install` in the project directory.

3. Start the development server with `pnpm run dev` and navigate to `http://localhost:3000` in your browser.

## Docker

You can also build and run BetterBahn as a Docker container. A `Dockerfile` is included in the repository.

## Docker Compose

You can run the app with docker compose:

### Default/Development

`docker compose -f docker-compose/docker-compose.yaml --project-directory=./ up -d`

<http://localhost:3000>

## Installation Guides

For detailed installation instructions on different platforms:

- [Windows Installation (DE)](docs/Windows-Installation-de.md)
- [Linux Installation (DE)](docs/Linux-Installation-de.md)
- [Windows Installation (EN)](docs/Windows-Installation-en.md)
- [Linux Installation (EN)](docs/Linux-Installation-en.md)

## License

This project is licensed under the AGPL-3.0-only. See the [LICENSE](./LICENSE) file for details.

## Community and Contribution

Join the [Discord community](https://discord.gg/9pFXzs6XRK) to ask questions, share feedback, and connect with other users and contributors.

Want to contribute? Please read the [Code of Conduct](/CODE_OF_CONDUCT.md) and see the [Contributing Guide](/CONTRIBUTE.md) for details on how to get started.

## How it works

BetterBahn searches for train journeys and can use split ticketing to help you find cheaper options—though this is usually the exception, not the rule. For a detailed explanation and demonstration, check out the [YouTube video](https://www.youtube.com/watch?v=SxKtI8f5QTU).

## About the Author

Created by [Lukas Weihrauch](https://lukasweihrauch.de).

---

Made with ❤️ for train travelers in Germany.
