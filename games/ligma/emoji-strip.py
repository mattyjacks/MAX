import tkinter as tk
from tkinter import filedialog, messagebox
import csv
import re

# Function to extract emojis from input text
def extract_emojis(text):
    # Regular expression for matching emojis
    emoji_pattern = re.compile(
        r'['
        r'\U0001F600-\U0001F64F'  # Emoticons
        r'\U0001F300-\U0001F5FF'  # Symbols & pictographs
        r'\U0001F680-\U0001F6FF'  # Transport & map symbols
        r'\U0001F700-\U0001F77F'  # Alchemical symbols
        r'\U0001F780-\U0001F7FF'  # Geometric shapes extended
        r'\U0001F800-\U0001F8FF'  # Supplemental arrows-C
        r'\U0001F900-\U0001F9FF'  # Supplemental symbols & pictographs
        r'\U0001FA00-\U0001FA6F'  # Chess symbols
        r'\U0001FA70-\U0001FAFF'  # Symbols and pictographs extended-A
        r'\U00002700-\U000027BF'  # Dingbats
        r']+', 
        flags=re.UNICODE
    )
    return emoji_pattern.findall(text)

# Function to create CSV file
def create_csv(emojis):
    if not emojis:
        messagebox.showwarning("No Emojis Found", "The input text does not contain any emojis.")
        return

    file_path = filedialog.asksaveasfilename(
        defaultextension=".csv",
        filetypes=[("CSV files", "*.csv")]
    )

    if file_path:
        with open(file_path, mode="w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(["ID", "EMOJI"])
            for idx, emoji in enumerate(emojis):
                writer.writerow([idx, emoji])

        messagebox.showinfo("Success", f"CSV file created at {file_path}")

# Function to handle button click
def process_text():
    input_text = text_input.get("1.0", tk.END).strip()
    emojis = extract_emojis(input_text)
    create_csv(emojis)

# Set up the GUI
root = tk.Tk()
root.title("Emoji to CSV")
root.geometry("400x300")

label = tk.Label(root, text="Enter text containing emojis:")
label.pack(pady=10)

text_input = tk.Text(root, height=10, width=40)
text_input.pack(pady=10)

process_button = tk.Button(root, text="Generate CSV", command=process_text)
process_button.pack(pady=10)

root.mainloop()
