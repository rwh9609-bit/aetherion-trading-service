# Strategy Contributor Guide

Welcome to the Aetherion Trading Engine! This guide will help you contribute new trading strategies to the project.

## Getting Started

1. **Read the Documentation**
   - Review `DEVELOPER.md` for architecture, coding standards, and setup instructions.
   - Familiarize yourself with the local development workflow (see README and DEVELOPER.md).

2. **Explore Existing Strategies**
   - Navigate to `python/strategies/`.
   - Review `mean_reversion.py` for a sample implementation.
   - Check `__init__.py` for strategy registration patterns.

## Adding a New Strategy

1. **Create Your Strategy File**
   - Add a new Python file in `python/strategies/`, e.g., `my_strategy.py`.
   - Use clear function/class definitions and docstrings.
   - Follow the structure of existing strategies for consistency.

2. **Register Your Strategy**
   - If required, update `__init__.py` to include your new strategy.

3. **Testing**
   - Test your strategy locally using the dev workflow (Docker, etc.).
   - Add unit tests if possible (see `python/strategies/tests/` if available).

4. **Documentation**
   - Add comments and usage instructions in your strategy file.
   - Update project documentation if your strategy introduces new features or parameters.

5. **Code Quality**
   - Ensure your code is readable, well-documented, and follows PEP8 standards.
   - Validate input parameters and handle errors gracefully.

## Submitting Your Contribution

1. **Fork the Repository**
   - Create your own fork on GitHub.

2. **Create a Feature Branch**
   - Use a descriptive branch name, e.g., `feature/my-new-strategy`.

3. **Commit Your Changes**
   - Write clear commit messages.

4. **Open a Pull Request**
   - Submit a PR to the `dev` branch.
   - Include a description of your strategy, usage, and any relevant notes.

5. **Engage with Reviewers**
   - Respond to feedback and make requested changes.

## Need Help?
- Open an issue on GitHub.
- Reach out via Discord/Matrix (see DEVELOPER.md for details).

Thank you for contributing to Aetherion!
