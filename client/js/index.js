$(window).on("load", function() {
    $("#btn_login").on("click", function() {
        $.post("login", {
            id: $(".id_login").val(),
            password: $(".pw_login").val()
        }, function(data) {
            if (data.success == true) {
                window.open("/class.html",
                    "Remote Education System", "width=1080,height=720,scrollbars=no,toolbar=no");
            } else {
                alert("잘못된 아이디 혹은 비밀번호입니다. ")
            }
        });
    });
});