export async function loadTemplateBase64(page: 1 | 2 = 1): Promise<string> {
  const filename = page === 1 ? '/template_page1.png' : '/template_page2.png';
  const res = await fetch(filename);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

