# forms.py

from wtforms import Form, StringField, SelectField, validators

class MusicSearchForm(Form):
    choices = [('Thamarai', 'Thamarai'),
               ('Malligai', 'Malligai'),
               ('Sannasi C-block', 'Sannasi C-block'),
               ('Dr.B.C.Roy', 'Dr.B.C.Roy'),
               ('Nelson Mandela', 'Nelson Mandela')]
    select = SelectField('Select Hostel:', choices=choices)
    search = StringField('Search Room Number:')


class AlbumForm(Form):
    media_types = [('Thamarai', 'Thamarai'),
               ('Malligai', 'Malligai'),
               ('Sannasi C-block', 'Sannasi C-block'),
               ('Dr.B.C.Roy', 'Dr.B.C.Roy'),
               ('Nelson Mandela', 'Nelson Mandela')]
    artist = StringField('Artist')
    title = StringField('Room Number')
    release_date = StringField('Name')
    publisher = StringField('Branch')
    media_type = SelectField('Hostel', choices=media_types)
