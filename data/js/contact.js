function onSubmit(token) {
    // var e = document.getElementById("contact-form").submit();
    // console.log(e);
    $('#submit-button').attr("disabled", true);
    $('#submit-spinner').css("display", "inline-block");
    const data = $('#contact-form').serialize();
    // window.location.href = '/post-contact'
    $.ajax({
        url: "https://europe-west1-waleko-personal.cloudfunctions.net/mail",
        contentType: 'application/x-www-form-urlencoded',
        type: 'POST',
        data: data,
        success: function (data) {
            if (data.success) {
                window.location.href = '/post-contact';
            }
            console.log('Form submitted');
        },
        error: function (data) {
            $('#submit-spinner').css("display", "none");
            $('#submit-button').attr("disabled", false);
            console.error(data);
            console.log('form error.');
            data = data.responseJSON;
            var code = 'unknown:error';
            var title = 'Unknown error';
            var body = "Something went wrong. Try again or email me directly: a.kovrigin0@gmail.com";
            if (data) {
                if (data.success) {
                    console.error('Form submitted, but errored!');
                    window.location.href = '/post-contact';
                    return;
                }
                code = data.code;
                title = data.message;
                body = data.body;
            }
            $('#modal-code').text(code);
            $('#modal-title').text(title);
            $('#modal-body').text(body);
            $('#modal').modal('show');
        },
        failure: function (data) {
            console.error(data);
            console.log('form submit failed.');
            var code = 'unknown:error';
            var title = 'Unknown error';
            var body = "Something went very wrong. Please email me directly: a.kovrigin0@gmail.com";
            $('#modal-code').text(code);
            $('#modal-title').text(title);
            $('#modal-body').text(body);
            $('#modal').show();
        }
    });
}
