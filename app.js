
var loadingSpinner = document.getElementById('loading-spinner');
var fullScreenModal = document.getElementById('fullScreenModal');
var fullScreenImage = document.getElementById('fullScreenImage');
var photos = [];
var currentPhotoIndex = 0;

// Initialize Firebase
var firebaseConfig = {
    apiKey: "AIzaSyBwiyeNUalhfMTL9FJ0J3KQSTF6K0wjCaw",
    authDomain: "photo-7a6b6.firebaseapp.com",
    projectId: "photo-7a6b6",
    storageBucket: "photo-7a6b6.appspot.com",
    messagingSenderId: "849680133816",
    appId: "1:849680133816:web:aa659c4d7ecd01bcd18e4d",
};

firebase.initializeApp(firebaseConfig);

var storage = firebase.storage();
var alertShown = false;

function uploadFile(file, path) {
    return new Promise(function (resolve, reject) {
        var storageRef = storage.ref(path);
        var task = storageRef.put(file);

        var progressBar = document.querySelector('.upload-progress');
        progressBar.style.display = 'block';

        task.on(
            'state_changed',
            function progress(snapshot) {
                var percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.value = percentage;
            },
            function error(err) {
                console.log('Upload failed:', err);
                alert('Upload failed: ' + err.message);
                progressBar.style.display = 'none';
                reject(err);
            },
            function complete() {
                console.log('Upload complete');
                progressBar.style.display = 'none';
                resolve();
            }
        );
    });
}

document.querySelector('#select-all-btn').addEventListener('click', function () {
    var checkboxes = document.querySelectorAll('.photo-checkbox');
    var selectAll = !checkboxes[0].checked;

    checkboxes.forEach(function (checkbox) {
        checkbox.checked = selectAll;
    });

    updateDeleteButtonState();
});

document.querySelector('#upload-form').addEventListener('submit', function (e) {
    e.preventDefault();
    uploadFiles();
});

function uploadFiles() {
    var fileInput = document.getElementById('photo');
    var files = fileInput.files;

    if (files.length === 0) {
        console.log('No files selected');
        return;
    }

    var promises = Array.from(files).map(file => {
        return uploadFile(file, 'photos/' + file.name);
    });

    Promise.all(promises)
        .then(() => {
            console.log('All uploads complete');
            displayTranslatedMessage('uploadComplete');
            getPhotos();
            document.querySelector('.upload-progress').style.display = 'none';
            fileInput.value = '';
        })
        .catch(error => {
            console.error('Error during uploads:', error);
            displayTranslatedMessage('uploadFailed' + error.message);
            document.querySelector('.upload-progress').style.display = 'none';
        });
}
function getPhotos() {
    loadingSpinner.style.display = 'block';
    var photosRef = storage.ref('photos');
    photosRef.listAll().then(function (result) {
        var html = '';
        photos = []; // Clear the photos collection before updating it
        result.items.forEach(function (photoRef, index) {
            photoRef.getDownloadURL().then(function (url) {
                html += '<div class="photo-container"><input type="checkbox" class="photo-checkbox" value="' + photoRef.fullPath + '"><img src="' + url + '" class="photo" onclick="openFullScreenModal(\'' + url + '\',' + index + ')"></div>';
                document.querySelector('#photos').innerHTML = html;
                photos.push({ src: url }); // Add each photo URL to the photos collection
            });
        });
        loadingSpinner.style.display = 'none';
    }).catch(function (error) {
        console.log('Error getting photos:', error);
        alert('Error getting photos: ' + error.message);
        loadingSpinner.style.display = 'none';
    });
}

getPhotos();

document.querySelector('#delete-btn').addEventListener('click', function () {
    var checkboxes = document.querySelectorAll('.photo-checkbox:checked');
    var checkedPaths = Array.from(checkboxes).map(function (checkbox) {
        return checkbox.value;
    });

    if (checkedPaths.length > 0) {
        if (confirm(displayTranslatedMessage('deleteConfirmation'))) {
            var promises = checkedPaths.map(function (path) {
                return storage.ref(path).delete();
            });

            Promise.all(promises)
                .then(function () {
                    displayTranslatedMessage('deleteSuccess');
                    location.reload();
                })
                .catch(function (error) {
                    console.log('Error deleting photos:', error);
                    displayTranslatedMessage('deleteError' + error.message);
                });
        }
    }
});



document.addEventListener('change', function (e) {
    if (e.target.classList.contains('photo-checkbox')) {
        updateDeleteButtonState();
    }
});



function updateDeleteButtonState() {
    var checkboxes = document.querySelectorAll('.photo-checkbox');
    var deleteBtn = document.querySelector('#delete-btn');
    var checkedCount = 0;
    for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
            checkedCount++;
        }
    }
    deleteBtn.disabled = checkedCount === 0;
}

document.addEventListener('DOMContentLoaded', function () {
    const closeBtn = document.getElementById('fullScreenCloseBtn');
    closeBtn.addEventListener('click', closeFullScreenModal);
});

function openFullScreenModal(url, index) {
    fullScreenImage.src = url;
    currentPhotoIndex = index;
    fullScreenModal.style.display = 'flex';

    // Remove the previous event listener to avoid multiple listeners
    fullScreenImage.removeEventListener('click', handleFullScreenClick);

    // Add the new event listener
    fullScreenImage.addEventListener('click', handleFullScreenClick);
}
var navigationInProgress = false;

function handleFullScreenClick(event) {
    if (navigationInProgress) {
        return; // Ignore click if navigation is already in progress
    }

    var rect = fullScreenImage.getBoundingClientRect();
    var clickX = event.clientX - rect.left;
    var threshold = rect.width / 2;

    navigationInProgress = true;

    if (clickX < threshold) {
        navigateFullScreenModal('ArrowLeft');
    } else {
        navigateFullScreenModal('ArrowRight');
    }

    // Use transitionend event to reset the navigation flag
    if (fullScreenImage) {
        fullScreenImage.addEventListener('transitionend', function onTransitionEnd() {
            navigationInProgress = false;
            fullScreenImage.removeEventListener('transitionend', onTransitionEnd);
        });
    } else {
        navigationInProgress = false;
    }
}





fullScreenImage.addEventListener('click', handleFullScreenClick);


fullScreenImage.addEventListener('mousedown', function (event) {
    var rect = fullScreenImage.getBoundingClientRect();
    var clickX = event.clientX - rect.left;
    var threshold = rect.width / 2;

    if (clickX < threshold) {
        // Clicked on the left side, navigate to the previous image
        navigateFullScreenModal('ArrowLeft');
    } else {
        // Clicked on the right side, navigate to the next image
        navigateFullScreenModal('ArrowRight');
    }
});

function navigateFullScreenModal(direction) {
    var newIndex;

    if (direction === 'ArrowLeft') {
        newIndex = (currentPhotoIndex - 1 + photos.length) % photos.length;
    } else if (direction === 'ArrowRight') {
        newIndex = (currentPhotoIndex + 1) % photos.length;
    }

    var newUrl = photos[newIndex].src;
    currentPhotoIndex = newIndex;
    fullScreenImage.src = newUrl;
}

function closeFullScreenModal() {
    fullScreenModal.style.display = 'none';
}

// Toggle dark background on button click or any other event
document.getElementById('toggle-dark-mode-btn').addEventListener('click', function () {
    document.body.classList.toggle('dark-background');
});

function displayTranslatedMessage(messageKey) {
    const languageSelect = document.getElementById('languageSelect');
    const selectedLanguage = languageSelect.value;

    const translations = {
        'uploadComplete': {
            'en': 'All uploads complete!  ',
            'es': '¡Subidas completas!  ',
            'fr': 'Toutes les téléchargements sont terminés!  ',
        },
        'uploadFailed': {
            'en': 'Upload failed: ',
            'es': 'Error al subir: ',
            'fr': 'Échec du téléchargement : ',
        },
        'deleteConfirmation': {
            'en': 'Are you sure you want to delete the selected photos?  ⁉️',
            'es': '¿Estás seguro de que quieres eliminar las fotos seleccionadas?  ⁉️',
            'fr': 'Êtes-vous sûr de vouloir supprimer les photos sélectionnées?  ⁉️',
        },
        'deleteSuccess': {
            'en': 'Selected photos deleted successfully! ',
            'es': '¡Fotos seleccionadas eliminadas con éxito! ',
            'fr': 'Photos sélectionnées supprimées avec succès! ',
        },
        'deleteError': {
            'en': 'Error deleting photos: ',
            'es': 'Error al eliminar fotos: ',
            'fr': 'Erreur lors de la suppression des photos : ',
        },
        'selectPhotosLabel': {
            'en': 'Select Photos:',
            'es': 'Seleccionar fotos:',
            'fr': 'Sélectionner des photos :',
        },
        'uploadButton': {
            'en': 'Upload',
            'es': 'Subir',
            'fr': 'Télécharger',
        },
    };

    const translatedMessage = translations[messageKey][selectedLanguage] || translations[messageKey]['en'];

    // Display the translated message using a custom dialog or any other method
    alert(translatedMessage);

    // Optionally, update the specific elements with translated text
    const translatedText = translations[messageKey][selectedLanguage];
    if (translatedText && document.getElementById(messageKey)) {
        document.getElementById(messageKey).innerText = translatedText;
    }
}



document.getElementById('translateButton').addEventListener('click', translatePage);
function translatePage() {
    const subscriptionKey = 'ccb6bda9a14643e9b3945a2c74a4566a';
    const languageSelect = document.getElementById('languageSelect');
    const targetLanguage = languageSelect.value;

    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=' + targetLanguage;

    // Selectively translate text content of specific elements
    const elementsToTranslate = document.querySelectorAll('h1, button, label, input[type="file"]');

    const textArray = Array.from(elementsToTranslate).map(element => {
        return { 'Text': element.innerText };
    });

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': 'centralus', // Replace with your Azure region code
        },
        body: JSON.stringify(textArray),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data && data.length > 0) {
            data.forEach((translation, index) => { 
                const translatedText = translation.translations[0].text;
                elementsToTranslate[index].innerText = translatedText;
            });
        } else {
            console.error('Invalid response format:', data);
        }
    })
    .catch(error => console.error('Error:', error));
}
