export const NotificationPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    event: async ({ event }) => {
      try {
        // Send notification on session completion
        if (event.type === "session.idle") {
          await $`notify-send --icon nvim --app-name "Neovim" "Session completed!" "opencode"`
        }
        if (event.type === "permission.asked") {
          await $`notify-send -u critical --icon nvim --app-name "Neovim" "Permission requested" "opencode"`
        }
      } catch (err) { }
    },
  }
}
