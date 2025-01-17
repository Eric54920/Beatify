<h1 align="center">Beatify</h1>

<h4 align="center"><strong>English</strong> | <a href="https://github.com/Eric54920/Beatify/blob/main/README-zh.md">简体中文</a></h4>

**Beatify** is a modern, feature-rich streaming media player designed for high-quality music playback. Built with **Golang**, **Wails**, **Vue 3**, and **ShadCN Vue**, Beatify offers an immersive audio experience with support for various audio formats and seamless integration with popular network protocols.

![cover](./docs/cover.jpg) 

## Features

- **High-Quality Audio Playback**: Supports a variety of audio formats, including:
  - **FLAC**
  - **ALAC**
  - **MP3**
  - **WAV**
  - **ACC**
  - and more.

- **Network Protocol Support**:
  - **WebDAV**
  
  Stream your music directly from remote servers or network shares without any hassle.

## Technologies Used

- **[Golang](https://golang.org/)**: The powerful backend engine for handling streaming and performance optimizations.
- **[Wails](https://wails.io/)**: Used for cross-platform application development with a native feel.
- **[Vue 3](https://vuejs.org/)**: A progressive JavaScript framework for building user interfaces.
- **[ShadCN Vue](https://www.shadcn-vue.com/)**: Provides a modern design system and styling utilities to ensure a clean, customizable UI.

## Installation

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/Eric54920/Beatify.git
    cd Beatify
    ```

2. **Backend Setup**:
   Ensure you have **Golang** installed. Instructions for installing dependencies and running the backend will depend on your specific environment.

3. **Frontend Setup**:
    Install necessary frontend dependencies:
    ```bash
    npm install
    ```

4. **Run the Application**:
    ```bash
    npm run dev
    ```

5. **Build for Production**:
   To build the application for production:
    ```bash
    npm run build
    ```

## Usage

Once the application is running, you can:
- **Connect to Remote Servers**: Set up connections using WebDAV for seamless streaming from your personal music server or network.
- **Play Audio Files**: Load and play high-quality FLAC, MP3, and other supported audio formats.

## Contributing

Contributions are welcome! If you have suggestions for new features, optimizations, or bug fixes, feel free to fork the repository and submit a pull request.

### Development Setup

1. Fork the repository.
2. Create a new feature branch:
    ```bash
    git checkout -b feature-name
    ```
3. Make changes and test thoroughly.
4. Commit your changes and push the branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request with a clear description of your changes.

## License

This project is licensed under the GPL-3.0 License. See the [LICENSE](LICENSE) file for more information.

---

Enjoy high-quality, seamless audio playback with **Beatify**!
