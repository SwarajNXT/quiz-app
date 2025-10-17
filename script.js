document.addEventListener('DOMContentLoaded', function() {

    // --- Feather Icons Initialization ---
    // This function finds all feather icons and replaces them with SVG
    feather.replace();

    // --- Hamburger Menu Functionality ---
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const navList = document.querySelector('.nav-list');
    const header = document.querySelector('.header');

    hamburgerMenu.addEventListener('click', () => {
        navList.classList.toggle('active');
        // Change icon between menu and close (X)
        const icon = hamburgerMenu.querySelector('i');
        if (navList.classList.contains('active')) {
            icon.setAttribute('data-feather', 'x');
        } else {
            icon.setAttribute('data-feather', 'menu');
        }
        feather.replace(); // Re-run to render the new icon
    });

    // --- Subject Tabs Functionality ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const subjectContents = document.querySelectorAll('.subject-content');

    tabLinks.forEach(tab => {
        tab.addEventListener('click', () => {
            const subject = tab.dataset.subject;

            // Update active state for tabs
            tabLinks.forEach(link => link.classList.remove('active'));
            tab.classList.add('active');

            // Show the corresponding content and hide others
            subjectContents.forEach(content => {
                if (content.id === subject) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // --- Active Nav Link on Scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - (header.offsetHeight + 100)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            // The href attribute looks like '#about', we need to match it with the section ID 'about'
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
        
        // Default to Home if no section is matched (i.e., at the top)
        if (!current) {
             document.querySelector('.nav-link[href="#"]').classList.add('active');
        }
    });

});

