import os
import tkinter as tk
from tkinter import filedialog, messagebox
import argparse

# Default ignore list
DEFAULT_IGNORE_LIST = ["/node_modules/", "/venv/", ".git"]

def concatenate_codebase_to_file(input_folder, output_file, ignore_list):
    """
    Reads all files in a folder, ignoring specified directories, and concatenates
    their contents into a single file with relative file paths as headings.
    """
    ignore_set = set(os.path.normpath(input_folder + item) for item in ignore_list)
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(input_folder):
            # Remove ignored directories from the walk
            dirs[:] = [d for d in dirs if os.path.normpath(os.path.join(root, d)) not in ignore_set]

            for file in files:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, input_folder)
                outfile.write(f"\n--- FILE: {relative_path} ---\n\n")
                try:
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"[Error reading file: {e}]\n")

# Tkinter-based GUI
class FreeGemApp:
    def __init__(self, root):
        self.root = root
        self.root.title("freeGem")

        # Input folder selection
        self.input_label = tk.Label(root, text="Select Codebase Folder:")
        self.input_label.pack()
        self.input_folder = tk.Entry(root, width=50)
        self.input_folder.pack()
        self.input_button = tk.Button(root, text="Browse", command=self.browse_input_folder)
        self.input_button.pack()

        # Output file selection
        self.output_label = tk.Label(root, text="Select Output File:")
        self.output_label.pack()
        self.output_file = tk.Entry(root, width=50)
        self.output_file.pack()
        self.output_button = tk.Button(root, text="Browse", command=self.browse_output_file)
        self.output_button.pack()

        # Ignore list input
        self.ignore_label = tk.Label(root, text="Ignore List (comma-separated):")
        self.ignore_label.pack()
        self.ignore_list = tk.Entry(root, width=50)
        self.ignore_list.insert(0, ','.join(DEFAULT_IGNORE_LIST))
        self.ignore_list.pack()

        # Run button
        self.run_button = tk.Button(root, text="Run", command=self.run_freegem)
        self.run_button.pack()

    def browse_input_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.input_folder.delete(0, tk.END)
            self.input_folder.insert(0, folder)

    def browse_output_file(self):
        file = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text files", "*.txt")])
        if file:
            self.output_file.delete(0, tk.END)
            self.output_file.insert(0, file)

    def run_freegem(self):
        input_folder = self.input_folder.get()
        output_file = self.output_file.get()
        ignore_list = self.ignore_list.get().split(',')

        if not input_folder or not output_file:
            messagebox.showerror("Error", "Please specify both input folder and output file.")
            return

        try:
            concatenate_codebase_to_file(input_folder, output_file, ignore_list)
            messagebox.showinfo("Success", f"Codebase has been processed successfully! Output saved to {output_file}.")
        except Exception as e:
            messagebox.showerror("Error", f"An error occurred: {e}")

# Command-line interface
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Concatenate an entire codebase into a single text file.")
    parser.add_argument("--input", help="Path to the input codebase folder.", required=False)
    parser.add_argument("--output", help="Path to the output text file.", required=False)
    parser.add_argument("--ignore", help="Comma-separated list of directories to ignore.", default=','.join(DEFAULT_IGNORE_LIST))

    args = parser.parse_args()

    if args.input and args.output:
        ignore_list = args.ignore.split(',')
        try:
            concatenate_codebase_to_file(args.input, args.output, ignore_list)
            print(f"Codebase has been processed successfully! Output saved to {args.output}.")
        except Exception as e:
            print(f"An error occurred: {e}")
    else:
        # If no command-line arguments, launch GUI
        root = tk.Tk()
        app = FreeGemApp(root)
        root.mainloop()