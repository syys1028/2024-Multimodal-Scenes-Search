<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json");
    function get_movie_titles() {
        $dirname = 'C:/Users/UBIT/movie/';
        $result_array = array();
        if (is_dir($dirname)) {
            if ($handle = opendir($dirname)) {
                while (($file = readdir($handle)) !== false) {
                    if ($file == '.' || $file == '..') continue;
                    if (is_file($dirname . $file)) {
                        $result_array[] = $file;
                    }
                }
                closedir($handle);
            } else {
                error_log('Failed to open directory: ' . $dirname);
            }
        } else {
            error_log('Directory does not exist: ' . $dirname);
        }
        rsort($result_array);
        return $result_array;
    }

    $movie_titles = get_movie_titles();
    echo json_encode($movie_titles);
?>
