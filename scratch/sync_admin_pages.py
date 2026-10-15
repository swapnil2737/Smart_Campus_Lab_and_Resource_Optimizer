with open('admin.html', 'r', encoding='utf-8') as f:
    text = f.read()

text_pages = text.replace('href="css/', 'href="../css/').replace('src="js/', 'src="../js/')

with open('pages/admin.html', 'w', encoding='utf-8') as f:
    f.write(text_pages)

print('pages/admin.html synchronized with admin.html!')
