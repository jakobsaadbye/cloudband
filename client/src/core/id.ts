const generateId = () => {
    const uuid = crypto.randomUUID();
    const splitted = uuid.split('-');
    const twoFirstSections = splitted.slice(0, 2);
    return 'x' + twoFirstSections.join('');
}

export {
    generateId
}